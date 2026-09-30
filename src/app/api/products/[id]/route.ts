import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { requirePermission } from "@/lib/require-permission";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("produtos", "Editar");

  if (!auth.authorized) {
    console.log("Usuário não autorizado para editar produtos.");
    return auth.response;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existingProduct = await prisma.product.findFirst({
      where: { id, lojaId: auth.user.lojaId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    if (body.incrementStock !== undefined) {
      const product = await prisma.product.update({
        where: { id },
        data: {
          stock: {
            increment: Number(body.incrementStock),
          },
        },
        include: { category: true },
      });

      return NextResponse.json({
        ...product,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
      });
    }

    const validation = productSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos: " + validation.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    Object.keys(data).forEach(
      (key) =>
        data[key as keyof typeof data] === undefined &&
        delete data[key as keyof typeof data],
    );

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado para atualizar." },
        { status: 400 },
      );
    }

    if (data.categoryId) {
      const existingCategory = await prisma.category.findFirst({
        where: { id: data.categoryId, lojaId: auth.user.lojaId },
      });
      if (!existingCategory) {
        return NextResponse.json(
          { error: "Categoria inválida ou não pertence à loja." },
          { status: 400 },
        );
      }
    }

    const toNull = (v?: string | null) =>
      v === "" || v === undefined ? null : v;

    const normalizedData = {
      ...data,
      ...(data.code !== undefined && { code: toNull(data.code) }),
      ...(data.barcode !== undefined && { barcode: toNull(data.barcode) }),
      ...(data.description !== undefined && {
        description: toNull(data.description),
      }),
      ...(data.image !== undefined && { image: toNull(data.image) }),
      ...(data.notes !== undefined && { notes: toNull(data.notes) }),
      ...(data.categoryId !== undefined && {
        categoryId: toNull(data.categoryId),
      }),
    };

    const product = await prisma.product.update({
      where: { id },
      data: normalizedData,
      include: {
        category: true,
      },
    });

    return NextResponse.json({
      ...product,
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um produto com este código (SKU)." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar produto" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("produtos", "Excluir");

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: { id, lojaId: auth.user.lojaId },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);

    return NextResponse.json(
      { error: "Erro ao deletar produto" },
      { status: 400 },
    );
  }
}
