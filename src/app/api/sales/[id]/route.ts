import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { SaleStatus } from "@/prisma/client";
import { createAuditLog } from "@/lib/audit";
import { saleSchema } from "@/lib/validations/sale";

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
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 },
      );
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      const storeSettings = await tx.settings.findUnique({
        where: { lojaId: auth.user.lojaId },
      });
      const config = (storeSettings?.config as any) ?? {};
      const trackStock = config?.products?.trackStock ?? true;
      const blockOutOfStock = config?.sales?.blockOutOfStock ?? false;

      // Se a venda está sendo cancelada e antes não era: devolve estoque
      if (body.status === SaleStatus.CANCELADO && existing.status !== SaleStatus.CANCELADO) {
        if (trackStock) {
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
        }
      }

      // Se a venda era cancelada e está sendo reativada: baixa estoque novamente
      if (existing.status === SaleStatus.CANCELADO && body.status !== SaleStatus.CANCELADO) {
        if (trackStock) {
          for (const item of existing.items) {
            const p = await tx.product.findUnique({ where: { id: item.productId } });
            if (blockOutOfStock && p && p.stock !== null && p.stock.toNumber() < Number(item.quantity)) {
              throw new Error(`Estoque insuficiente para reativar o produto ${item.productName}.`);
            }
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            });
          }
        }
      }

      return tx.sale.update({
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
    });

    if (existing.status !== updatedSale.status) {
      await createAuditLog({
        action: body.status === SaleStatus.CANCELADO ? "CANCEL_SALE" : "UPDATE_SALE_STATUS",
        entity: "Sale",
        entityId: id,
        details: {
          oldStatus: existing.status,
          newStatus: updatedSale.status,
          saleNumber: existing.saleNumber,
          total: Number(existing.total),
        },
        userId: auth.user.id,
        lojaId: auth.user.lojaId,
      });
    }

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error("Erro ao atualizar venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar a venda." },
      { status: 500 },
    );
  }
}

export async function PUT(
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

    const parsed = saleSchema.parse(body);

    const existing = await prisma.sale.findFirst({
      where: { id, lojaId: auth.user.lojaId },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Venda não encontrada." },
        { status: 404 },
      );
    }

    if (existing.status === SaleStatus.CANCELADO) {
      return NextResponse.json(
        { error: "Não é possível editar uma venda que está cancelada." },
        { status: 400 },
      );
    }

    const productIds = parsed.items.map((i) => i.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, lojaId: auth.user.lojaId },
    });

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "Um ou mais produtos informados são inválidos ou não pertencem à loja." },
        { status: 400 },
      );
    }

    const updatedSale = await prisma.$transaction(async (tx) => {
      const storeSettings = await tx.settings.findUnique({
        where: { lojaId: auth.user.lojaId },
      });
      const config = (storeSettings?.config as any) ?? {};
      const trackStock = config?.products?.trackStock ?? true;
      const blockOutOfStock = config?.sales?.blockOutOfStock ?? false;
      const openPriceEnabled = config?.sales?.openPriceEnabled ?? false;
      const openPriceMode = config?.sales?.openPriceMode ?? "ALL";
      const openPriceProductIds = config?.sales?.openPriceProductIds ?? [];

      // 1. Devolve o estoque dos itens antigos da venda
      if (trackStock) {
        for (const oldItem of existing.items) {
          await tx.product.update({
            where: { id: oldItem.productId },
            data: {
              stock: {
                increment: oldItem.quantity,
              },
            },
          });
        }
      }

      // 2. Monta os novos itens e valida disponibilidade de estoque
      const productsInDb = await tx.product.findMany({
        where: { id: { in: productIds }, lojaId: auth.user.lojaId },
      });
      const productMap = new Map(productsInDb.map((p) => [p.id, p]));

      let calculatedTotal = 0;
      const saleItemsData = [];

      for (const item of parsed.items) {
        if (item.quantity <= 0) {
          throw new Error("Quantidade inválida para o produto.");
        }
        const dbProduct = productMap.get(item.productId);
        if (!dbProduct) {
          throw new Error("Produto não encontrado.");
        }

        if (trackStock && blockOutOfStock && dbProduct.stock !== null && dbProduct.stock.toNumber() < item.quantity) {
          throw new Error(`Estoque insuficiente para o produto ${dbProduct.name}.`);
        }

        const isProductOpenPrice = openPriceEnabled && (
          openPriceMode === "ALL" ||
          (Array.isArray(openPriceProductIds) && openPriceProductIds.includes(item.productId))
        );

        const unitPrice = (isProductOpenPrice && item.unitPrice && item.unitPrice > 0)
          ? item.unitPrice
          : dbProduct.salePrice.toNumber();

        const subtotal = item.quantity * unitPrice;
        calculatedTotal += subtotal;

        saleItemsData.push({
          productId: item.productId,
          productName: dbProduct.name,
          quantity: item.quantity,
          unitPrice: unitPrice,
          subtotal: subtotal,
        });
      }

      const discount = parsed.discount ?? 0;
      if (discount < 0 || discount > calculatedTotal) {
        throw new Error("Desconto inválido.");
      }

      const finalTotal = calculatedTotal - discount;

      // 3. Remove itens anteriores
      await tx.saleItem.deleteMany({
        where: { saleId: id },
      });

      // 4. Decrementa o estoque dos novos itens
      if (trackStock) {
        for (const item of saleItemsData) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // 5. Atualiza a venda
      const sale = await tx.sale.update({
        where: { id },
        data: {
          clientId: parsed.clientId,
          clientName: parsed.clientName,
          total: finalTotal,
          discount: discount,
          paymentMethod: parsed.paymentMethod,
          status: parsed.status,
          dueDate: parsed.dueDate
            ? parsed.dueDate.includes("T")
              ? new Date(parsed.dueDate)
              : new Date(`${parsed.dueDate}T12:00:00.000Z`)
            : null,
          notes: parsed.notes,
          items: {
            create: saleItemsData,
          },
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

      return sale;
    });

    await createAuditLog({
      action: "UPDATE_SALE",
      entity: "Sale",
      entityId: id,
      details: {
        saleNumber: existing.saleNumber,
        oldTotal: Number(existing.total),
        newTotal: Number(updatedSale.total),
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json(updatedSale);
  } catch (error: any) {
    console.error("Erro ao editar venda:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao editar venda." },
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

    // Cancelar venda: devolve estoque se a venda não estava cancelada e marca como CANCELADO
    await prisma.$transaction(async (tx) => {
      const storeSettings = await tx.settings.findUnique({
        where: { lojaId: auth.user.lojaId },
      });
      const config = (storeSettings?.config as any) ?? {};
      const trackStock = config?.products?.trackStock ?? true;

      if (trackStock && existing.status !== SaleStatus.CANCELADO) {
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
      }

      await tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELADO,
        },
      });
    });

    await createAuditLog({
      action: "CANCEL_SALE",
      entity: "Sale",
      entityId: id,
      details: {
        saleNumber: existing.saleNumber,
        total: Number(existing.total),
      },
      userId: auth.user.id,
      lojaId: auth.user.lojaId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao cancelar venda:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar a venda." },
      { status: 500 },
    );
  }
}
