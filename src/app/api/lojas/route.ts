import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const where = user?.lojaId ? { id: user.lojaId } : {};
    const loja = await prisma.loja.findFirst({
      where,
      include: {
        address: true,
      },
    });

    if (!loja) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    const firstAddress = Array.isArray(loja.address) && loja.address.length > 0 ? loja.address[0] : null;

    return NextResponse.json({
      ...loja,
      address: firstAddress,
    });
  } catch (error) {
    console.error("Erro ao buscar loja:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, ...lojaData } = body;

    const loja = await prisma.loja.create({
      data: {
        ...lojaData,
        ...(address && Object.values(address).some((v) => !!v && String(v).trim() !== "")
          ? {
              address: {
                create: {
                  street: address.street || "",
                  number: address.number || "",
                  complement: address.complement || "",
                  neighborhood: address.neighborhood || "",
                  city: address.city || "",
                  state: address.state || "",
                  zipCode: address.zipCode || "",
                },
              },
            }
          : {}),
        accessGroups: {
          create: {
            name: "ADMIN",
            description: "Acesso total ao sistema",
            permissions: {
              clientes: [
                "Visualizar",
                "Adicionar",
                "Editar",
                "Excluir",
              ],
              produtos: [
                "Visualizar",
                "Adicionar",
                "Editar",
                "Excluir",
              ],
              dashboard: ["Visualizar"],
              historico: [
                "Visualizar",
                "Editar",
                "Excluir",
              ],
              "nova-venda": [
                "Visualizar",
                "Adicionar",
              ],
            },
          },
        },
        clients: {
          create: {
            name: "Consumidor Final",
            phone: "",
          },
        },
      },
      include: {
        address: true,
      },
    });

    const firstAddress = Array.isArray(loja.address) && loja.address.length > 0 ? loja.address[0] : null;

    return NextResponse.json({
      ...loja,
      address: firstAddress,
    });
  } catch (error) {
    console.error("Erro ao criar loja:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao criar loja." },
      { status: 500 },
    );
  }
}
