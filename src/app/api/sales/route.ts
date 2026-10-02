import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Ajuste o caminho do seu prisma se necessário
import { saleSchema } from "@/lib/validations/sale";
import { requirePermission } from "@/lib/require-permission";

export async function GET() {
  try {
    const auth = await requirePermission("historico", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const sales = await prisma.sale.findMany({
      where: { lojaId: user.lojaId },
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
    });
    return NextResponse.json(sales);
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

    // Usa $transaction para garantir que a venda e o desconto no estoque ocorram juntos
    const sale = await prisma.$transaction(async (tx) => {
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

      for (const item of parsed.items) {
        if (item.quantity <= 0) {
          throw new Error("Quantidade inválida para o produto.");
        }
        const dbProduct = productMap.get(item.productId);
        if (!dbProduct) {
          throw new Error("Produto não encontrado.");
        }
        
        // Verifica estoque (opcional: se o sistema permitir estoque negativo, pode remover este if)
        // if (dbProduct.stock !== null && dbProduct.stock < item.quantity) {
        //  throw new Error(`Estoque insuficiente para o produto ${dbProduct.name}.`);
        // }

        const unitPrice = dbProduct.salePrice.toNumber();
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

      // 2. Decrementa o estoque de cada produto vendido
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

      return newSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos: " + error.issues[0].message },
        { status: 400 },
      );
    }
    // Tratamento de erros lançados dentro da transação
    if (error instanceof Error && (error.message.includes("Quantidade inválida") || error.message.includes("Desconto inválido") || error.message.includes("Produto não encontrado"))) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro interno ao processar a venda." },
      { status: 500 },
    );
  }
}
