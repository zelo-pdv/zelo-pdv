import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const loja = await prisma.loja.findUnique({
      where: { id: user.lojaId },
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
  // Limite estrito: 3 criações de loja por hora por IP para evitar spam/DoS
  const rateLimit = checkRateLimit(request, 3, 60 * 60 * 1000);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas de criação de loja. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  try {
    const textBody = await request.text();
    // Limita o tamanho do payload para evitar abuso (10KB)
    if (textBody.length > 10240) {
      return NextResponse.json({ error: "Payload muito grande." }, { status: 413 });
    }

    const body = JSON.parse(textBody);
    
    // Validação básica
    if (!body.name || typeof body.name !== 'string' || body.name.length < 3 || body.name.length > 50) {
      return NextResponse.json({ error: "Nome da loja inválido." }, { status: 400 });
    }
    if (!body.ownerName || typeof body.ownerName !== 'string' || body.ownerName.length < 1 || body.ownerName.length > 50) {
      return NextResponse.json({ error: "Nome do responsável inválido." }, { status: 400 });
    }
    if (body.document && (typeof body.document !== 'string' || body.document.length > 20)) {
      return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
    }

    const { address, ownerEmail, ownerPassword, ...lojaData } = body;

    if (!ownerEmail || typeof ownerEmail !== 'string' || !ownerEmail.includes('@')) {
      return NextResponse.json({ error: "E-mail do responsável inválido." }, { status: 400 });
    }
    if (!ownerPassword || typeof ownerPassword !== 'string' || ownerPassword.length < 6) {
      return NextResponse.json({ error: "A senha do responsável deve ter pelo menos 6 caracteres." }, { status: 400 });
    }

    const emailExists = await prisma.user.findUnique({
      where: { email: ownerEmail.trim().toLowerCase() }
    });
    if (emailExists) {
      return NextResponse.json({ error: "Este e-mail já está em uso." }, { status: 400 });
    }

    const { hash } = await import('bcryptjs');
    const hashedPassword = await hash(ownerPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const loja = await tx.loja.create({
        data: {
          name: lojaData.name,
          ownerName: lojaData.ownerName,
          document: lojaData.document,
          phone: lojaData.phone,
          email: lojaData.email,
          ...(address && Object.values(address).some((v) => !!v && String(v).trim() !== "")
            ? {
                address: {
                  create: {
                    street: address.street?.substring(0, 100) || "",
                    number: address.number?.substring(0, 20) || "",
                    complement: address.complement?.substring(0, 50) || "",
                    neighborhood: address.neighborhood?.substring(0, 50) || "",
                    city: address.city?.substring(0, 50) || "",
                    state: address.state?.substring(0, 2) || "",
                    zipCode: address.zipCode?.substring(0, 20) || "",
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
          accessGroups: true,
        },
      });

      const adminGroup = loja.accessGroups.find(g => g.name === "ADMIN");

      const ownerUser = await tx.user.create({
        data: {
          name: lojaData.ownerName,
          email: ownerEmail.trim().toLowerCase(),
          password: hashedPassword,
          lojaId: loja.id,
          groupId: adminGroup!.id,
          active: true,
        }
      });

      const updatedLoja = await tx.loja.update({
        where: { id: loja.id },
        data: { ownerId: ownerUser.id },
        include: { address: true }
      });

      return updatedLoja;
    });

    const firstAddress = Array.isArray(result.address) && result.address.length > 0 ? result.address[0] : null;

    return NextResponse.json({
      ...result,
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
