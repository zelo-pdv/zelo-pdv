import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const lojaId = user.lojaId;

    const [productAgg, clientAgg, saleAgg, categoryAgg, userAgg, groupAgg] = await Promise.all([
      prisma.product.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.client.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.sale.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.category.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.user.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
      prisma.accessGroup.aggregate({
        where: { lojaId },
        _max: { updatedAt: true },
        _count: { id: true },
      }),
    ]);

    // Usamos um hash do user atual para o cliente detectar rapidamente se SUAS permissões mudaram
    const sessionHash = JSON.stringify({
      id: user.id,
      groupId: user.groupId,
      groupName: user.groupName,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
      active: user.active
    });

    return NextResponse.json(
      {
        products: `${productAgg._max.updatedAt?.getTime() ?? 0}_${productAgg._count.id}`,
        clients: `${clientAgg._max.updatedAt?.getTime() ?? 0}_${clientAgg._count.id}`,
        sales: `${saleAgg._max.updatedAt?.getTime() ?? 0}_${saleAgg._count.id}`,
        categories: `${categoryAgg._max.updatedAt?.getTime() ?? 0}_${categoryAgg._count.id}`,
        users: `${userAgg._max.updatedAt?.getTime() ?? 0}_${userAgg._count.id}`,
        access_groups: `${groupAgg._max.updatedAt?.getTime() ?? 0}_${groupAgg._count.id}`,
        session: sessionHash,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Erro na API de sincronização:", error);
    return NextResponse.json(
      { error: "Erro interno de sincronização" },
      { status: 500 }
    );
  }
}
