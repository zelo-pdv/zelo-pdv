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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("historico", "Excluir");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const existing = await prisma.sale.findFirst({
      where: { id, lojaId: auth.user.lojaId },
      include: {
        items: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 },
      );
    }

    // Use a transaction to delete the sale and restore stock
    await prisma.$transaction(async (tx) => {
      // 1. Delete sale items (or rely on Cascade, but let's be explicit or just let cascade do it if defined, Prisma usually does it on delete sale if onDelete: Cascade. 
      // But we need to update stock first.)
      
      // Restore stock
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      // Delete the sale (this will also delete saleItems due to cascade in schema)
      await tx.sale.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao excluir venda:", error);
    return NextResponse.json(
      { error: "Erro ao excluir a venda." },
      { status: 500 },
    );
  }
}
