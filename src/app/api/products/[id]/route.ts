import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { productSchema } from "@/lib/validations/product";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

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
      where: { id, lojaId: auth.user.lojaId, deletedAt: null },
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

      await createAuditLog({
        action: "UPDATE_STOCK",
        entity: "Product",
        entityId: id,
        details: {
          oldStock: Number(existingProduct.stock),
          newStock: Number(product.stock),
          increment: Number(body.incrementStock),
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
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

    const changedFields: any = {};
    if (normalizedData.salePrice !== undefined && Number(normalizedData.salePrice) !== Number(existingProduct.salePrice)) {
      changedFields.oldSalePrice = Number(existingProduct.salePrice);
      changedFields.newSalePrice = Number(product.salePrice);
    }
    if (normalizedData.costPrice !== undefined && Number(normalizedData.costPrice) !== Number(existingProduct.costPrice)) {
      changedFields.oldCostPrice = Number(existingProduct.costPrice);
      changedFields.newCostPrice = Number(product.costPrice);
    }
    if (normalizedData.stock !== undefined && Number(normalizedData.stock) !== Number(existingProduct.stock)) {
      changedFields.oldStock = Number(existingProduct.stock);
      changedFields.newStock = Number(product.stock);
    }

    if (Object.keys(changedFields).length > 0) {
      await createAuditLog({
        action: "UPDATE_PRODUCT",
        entity: "Product",
        entityId: id,
        details: changedFields,
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

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
      where: { id, lojaId: auth.user.lojaId, deletedAt: null },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    // Soft delete: preserva o histórico de vendas intacto e libera SKU/código de barras
    const suffix = `_del_${Date.now()}`;
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        code: existingProduct.code ? `${existingProduct.code}${suffix}` : null,
        barcode: existingProduct.barcode ? `${existingProduct.barcode}${suffix}` : null,
      },
    });

    await createAuditLog({
      action: "DELETE_PRODUCT",
      entity: "Product",
      entityId: id,
      details: {
        name: existingProduct.name,
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
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
