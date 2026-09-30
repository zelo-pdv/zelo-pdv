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

import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.success) return rateLimit.response;

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
          create: [
            {
              name: "ADMIN",
              description: "Administrador do Sistema (Acesso Total)",
              permissions: {
                dashboard: ["Visualizar"],
                historico: ["Visualizar", "Editar", "Excluir"],
                "nova-venda": ["Visualizar", "Adicionar"],
                clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
                produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
                categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
                configuracoes: ["Visualizar", "Editar", "Excluir"],
                usuarios: ["Visualizar", "Adicionar", "Editar", "Excluir"],
              },
            },
            {
              name: "Gerente",
              description: "Acesso gerencial com controle de vendas, produtos e clientes",
              permissions: {
                dashboard: ["Visualizar"],
                historico: ["Visualizar", "Editar", "Excluir"],
                "nova-venda": ["Visualizar", "Adicionar"],
                clientes: ["Visualizar", "Adicionar", "Editar", "Excluir"],
                produtos: ["Visualizar", "Adicionar", "Editar", "Excluir"],
                categorias: ["Visualizar", "Adicionar", "Editar", "Excluir"],
              },
            },
            {
              name: "Operador de Caixa",
              description: "Pode registrar vendas e consultar produtos e clientes",
              permissions: {
                dashboard: ["Visualizar"],
                "nova-venda": ["Visualizar", "Adicionar"],
                clientes: ["Visualizar", "Adicionar"],
                produtos: ["Visualizar"],
                historico: ["Visualizar"],
              },
            },
          ],
        },
        clients: {
          create: {
            name: "Consumidor Final",
            phone: "",
          },
        },
        categories: {
          create: {
            name: "Geral",
          },
        },
        units: {
          create: [
            { name: "Unidade", abbreviation: "UN", decimalPlaces: 0 },
            { name: "Quilo", abbreviation: "KG", decimalPlaces: 3 },
            { name: "Grama", abbreviation: "G", decimalPlaces: 0 },
            { name: "Litro", abbreviation: "L", decimalPlaces: 3 },
            { name: "Caixa", abbreviation: "CX", decimalPlaces: 0 },
            { name: "Pacote", abbreviation: "PCT", decimalPlaces: 0 },
            { name: "Metro", abbreviation: "M", decimalPlaces: 2 },
            { name: "Par", abbreviation: "PAR", decimalPlaces: 0 },
          ],
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
