import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { checkEmailConflict, checkPhoneConflict } from "@/lib/validations/uniqueness";

// [GET] /api/clients - Lista todos os clientes com seus endereços
export async function GET() {
  try {
    const auth = await requirePermission("clientes", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const clients = await prisma.client.findMany({
      where: { lojaId: user.lojaId },
      include: {
        address: true, // Inclui o endereço relacionado
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return NextResponse.json(
      { error: "Erro interno ao buscar clientes." },
      { status: 500 },
    );
  }
}

// [POST] /api/clients - Cria um novo cliente com endereço
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, notes, address } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Nome e telefone são obrigatórios." },
        { status: 400 },
      );
    }

    const auth = await requirePermission("clientes", "Adicionar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    // Validação de unicidade de e-mail e telefone cruzada (clientes e usuários)
    if (email && email.trim() !== "") {
      const emailConflict = await checkEmailConflict({
        email,
        lojaId: user.lojaId,
      });
      if (emailConflict) {
        return NextResponse.json({ error: emailConflict }, { status: 400 });
      }
    }

    if (phone && phone.trim() !== "") {
      const phoneConflict = await checkPhoneConflict({
        phone,
        lojaId: user.lojaId,
      });
      if (phoneConflict) {
        return NextResponse.json({ error: phoneConflict }, { status: 400 });
      }
    }

    const newClient = await prisma.client.create({
      data: {
        name,
        phone,
        email: email && email.trim() !== "" ? email.trim() : null,
        notes,
        active: body.active !== undefined ? Boolean(body.active) : true,
        lojaId: user.lojaId,
        address: address
          ? {
              create: {
                street: address.street || "",
                number: address.number || "",
                complement: address.complement || "",
                neighborhood: address.neighborhood || "",
                city: address.city || "",
                state: address.state || "",
                zipCode: address.zipCode || "",
                lojaId: user.lojaId,
              },
            }
          : undefined,
      },
      include: {
        address: true,
      },
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar cliente:", error);
    return NextResponse.json(
      { error: "Erro interno ao criar cliente." },
      { status: 500 },
    );
  }
}
