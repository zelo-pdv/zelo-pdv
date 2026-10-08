import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Ajuste o caminho do seu prisma se necessário
import { saleSchema } from "@/lib/validations/sale";
import { requirePermission } from "@/lib/require-permission";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const auth = await requirePermission("historico", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "5000", 10);
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: { lojaId: user.lojaId },
        take: limit,
        skip: skip,
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
      orderBy: {
        date: "desc",
      },
    }),
    prisma.sale.count({ where: { lojaId: user.lojaId } }),
  ]);
    return NextResponse.json({
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("Erro ao buscar vendas:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar vendas." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requirePermission("nova-venda", "Adicionar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await req.json();

    // Validação com Zod
    const parsed = saleSchema.parse(body);

    const productIds = parsed.items.map((item) => item.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, lojaId: user.lojaId },
    });

    if (existingProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: "Um ou mais produtos informados são inválidos ou não pertencem à loja." },
        { status: 400 }
      );
    }

    if (parsed.clientId) {
      const existingClient = await prisma.client.findFirst({
        where: { id: parsed.clientId, lojaId: user.lojaId },
      });
      if (!existingClient) {
        return NextResponse.json(
          { error: "Cliente informado é inválido ou não pertence à loja." },
          { status: 400 }
        );
      }
    }

    // Usa retry loop para lidar com falhas de concorrência no saleNumber (P2002)
    let sale;
    let retries = 3;
    while (retries > 0) {
      try {
        sale = await prisma.$transaction(async (tx) => {
          // Determina o próximo número sequencial da venda da loja
      const lastSale = await tx.sale.findFirst({
        where: { lojaId: user.lojaId, saleNumber: { not: null } },
        orderBy: { saleNumber: "desc" },
        select: { saleNumber: true },
      });

      let nextNumber = (lastSale?.saleNumber ?? 0) + 1;

      // Validação: garante que não existe nenhuma venda com essa numeração dentro da loja
      while (
        await tx.sale.findFirst({
          where: { lojaId: user.lojaId, saleNumber: nextNumber },
          select: { id: true },
        })
      ) {
        nextNumber++;
      }

      let calculatedTotal = 0;
      const saleItemsData = [];

      // Recupera todos os produtos novamente dentro da transação para garantir integridade e preço atualizado
      const productsInDb = await tx.product.findMany({
        where: { id: { in: productIds }, lojaId: user.lojaId }
      });
      const productMap = new Map(productsInDb.map(p => [p.id, p]));

      // Recupera configurações da loja para verificar se o controle de estoque está ativo
      const storeSettings = await tx.settings.findUnique({
        where: { lojaId: user.lojaId },
      });
      const config = (storeSettings?.config as any) ?? {};
      const trackStock = config?.products?.trackStock ?? true;
      const blockOutOfStock = config?.sales?.blockOutOfStock ?? false;

      const openPriceEnabled = config?.sales?.openPriceEnabled ?? false;
      const openPriceMode = config?.sales?.openPriceMode ?? "ALL";
      const openPriceProductIds = config?.sales?.openPriceProductIds ?? [];

      for (const item of parsed.items) {
        if (item.quantity <= 0) {
          throw new Error("Quantidade inválida para o produto.");
        }
        const dbProduct = productMap.get(item.productId);
        if (!dbProduct) {
          throw new Error("Produto não encontrado.");
        }
        
        // Verifica estoque apenas se o controle de estoque E o bloqueio de estoque insuficiente estiverem ativos
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
          productName: dbProduct.name, // Usa o nome real do banco
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

      // 1. Cria a venda e os itens da venda
      const newSale = await tx.sale.create({
        data: {
          lojaId: user.lojaId,
          sellerId: user.id,
          saleNumber: nextNumber,
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

      // 2. Decrementa o estoque atomicamente e valida sob underflow somente se o controle de estoque estiver ativo
      if (trackStock) {
        for (const item of saleItemsData) {
          const dbProduct = productMap.get(item.productId);
          if (dbProduct && dbProduct.stock !== null) {
            const updatedProduct = await tx.product.update({
              where: { id: item.productId },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
              select: { stock: true }
            });
            
            if (blockOutOfStock && updatedProduct.stock !== null && updatedProduct.stock.toNumber() < 0) {
              throw new Error(`Estoque insuficiente para o produto ${item.productName}.`);
            }
          }
        }
      }

      return newSale;
    });

        break; // Sucesso, sai do loop
      } catch (error: any) {
        if (error.code === 'P2002' && (
             (Array.isArray(error.meta?.target) && error.meta.target.includes('saleNumber')) || 
             (typeof error.meta?.target === 'string' && error.meta.target.includes('saleNumber')) ||
             (error.meta?.modelName === 'Sale' && error.message.includes('saleNumber'))
           )) {
          retries--;
          if (retries === 0) {
            throw new Error("Alta concorrência na geração do número da venda. Tente novamente.");
          }
          continue; // Tenta de novo na próxima iteração
        }
        throw error; // Outros erros repassa pra cima
      }
    }

    if (sale) {
      await createAuditLog({
        action: "CREATE_SALE",
        entity: "Sale",
        entityId: sale.id,
        details: {
          saleNumber: sale.saleNumber,
          total: Number(sale.total),
          itemsCount: sale.items.length,
        },
        userId: user.id,
        lojaId: user.lojaId,
      });
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos: " + error.issues[0].message },
        { status: 400 },
      );
    }
    console.log("SALE ERROR:", error);
    // Tratamento de erros lançados dentro da transação
    if (error instanceof Error && (error.message.includes("Quantidade inválida") || error.message.includes("Desconto inválido") || error.message.includes("Produto não encontrado") || error.message.includes("Estoque insuficiente"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro interno ao processar a venda." },
      { status: 500 },
    );
  }
}
