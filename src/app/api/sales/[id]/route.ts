import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { SaleStatus } from "@/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("historico", "Editar");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedStatuses = Object.values(SaleStatus);
    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Status inválido." },
        { status: 400 },
      );
    }

    const existing = await prisma.sale.findFirst({
      where: { id, lojaId: auth.user.lojaId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 },
      );
    }

    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        status: body.status,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error("Erro ao atualizar venda:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar a venda." },
      { status: 500 },
    );
  }
}
