import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("historico", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { lojaId: user.lojaId },
        take: limit,
        skip: skip,
        include: {
          user: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.auditLog.count({
        where: { lojaId: user.lojaId }
      })
    ]);

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Erro ao buscar logs de auditoria:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar logs." },
      { status: 500 }
    );
  }
}
