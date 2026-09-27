import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // Ajuste o caminho do seu prisma se necessário
import { saleSchema } from "@/lib/validations/sale";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();

    // Validação com Zod
    const parsed = saleSchema.parse(body);

    // Usa $transaction para garantir que a venda e o desconto no estoque ocorram juntos
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Cria a venda e os itens da venda
      const newSale = await tx.sale.create({
        data: {
          lojaId: user.lojaId,
          sellerId: user.id,
          clientId: parsed.clientId,
          clientName: parsed.clientName,
          total: parsed.total,
          discount: parsed.discount ?? 0,
          paymentMethod: parsed.paymentMethod,
          status: parsed.status,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          notes: parsed.notes,
          items: {
            create: parsed.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            })),
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
      for (const item of parsed.items) {
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
    return NextResponse.json(
      { error: "Erro interno ao processar a venda." },
      { status: 500 },
    );
  }
}
