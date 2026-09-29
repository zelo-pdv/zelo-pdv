import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";
import { checkEmailConflict, checkPhoneConflict } from "@/lib/validations/uniqueness";

// [GET] /api/clients/[id] - Busca um cliente específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    
    const auth = await requirePermission("clientes", "Visualizar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const client = await prisma.client.findUnique({
      where: { id, lojaId: user.lojaId },
      include: { address: true },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error("Erro ao buscar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cliente." },
      { status: 500 },
    );
  }
}

// [PATCH] /api/clients/[id] - Atualiza um cliente e seu endereço
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, email, notes, address, active } = body;

    const auth = await requirePermission("clientes", "Editar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    // Validate that client belongs to user's loja before updating
    const existingClient = await prisma.client.findUnique({ where: { id, lojaId: user.lojaId } });
    if (!existingClient) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    // Validação de unicidade cruzada de e-mail e telefone
    if (email !== undefined && email !== null && email.trim() !== "") {
      const emailConflict = await checkEmailConflict({
        email,
        lojaId: user.lojaId,
        excludeClientId: id,
      });
      if (emailConflict) {
        return NextResponse.json({ error: emailConflict }, { status: 400 });
      }
    }

    if (phone !== undefined && phone !== null && phone.trim() !== "") {
      const phoneConflict = await checkPhoneConflict({
        phone,
        lojaId: user.lojaId,
        excludeClientId: id,
      });
      if (phoneConflict) {
        return NextResponse.json({ error: phoneConflict }, { status: 400 });
      }
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email: email && email.trim() !== "" ? email.trim() : null } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        // Como o relacionamento é de lista (to-many), usamos deleteMany + create
        // para substituir o endereço antigo pelo novo com segurança.
        address: address
          ? {
              deleteMany: {},
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

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente." },
      { status: 500 },
    );
  }
}

// [DELETE] /api/clients/[id] - Remove um cliente
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const auth = await requirePermission("clientes", "Excluir");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    // Validate that client belongs to user's loja before deleting
    const existingClient = await prisma.client.findUnique({ where: { id, lojaId: user.lojaId } });
    if (!existingClient) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    // Remove os endereços vinculados antes de apagar o cliente
    await prisma.address
      .deleteMany({
        where: { clientId: id, lojaId: user.lojaId },
      })
      .catch(() => {});

    await prisma.client.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    return NextResponse.json(
      { error: "Erro ao deletar cliente." },
      { status: 500 },
    );
  }
}
