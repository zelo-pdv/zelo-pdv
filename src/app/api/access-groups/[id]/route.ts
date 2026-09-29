import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-permission";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { name, description, active, permissions } = body;

    const existing = await prisma.accessGroup.findFirst({
      where: { id, lojaId: auth.user.lojaId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
    }

    const group = await prisma.accessGroup.update({
      where: { id },
      data: {
        name,
        description,
        active,
        permissions,
      },
    });

    return NextResponse.json(group);
  } catch (error: any) {
    // Exibe o erro real no terminal do Next.js para análise
    console.error("--> ERRO DETALHADO NO PATCH:", error);

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um grupo com este nome." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erro desconhecido ao atualizar grupo." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const existing = await prisma.accessGroup.findFirst({
      where: { id, lojaId: auth.user.lojaId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
    }

    const usersCount = await prisma.user.count({
      where: { groupId: id },
    });

    if (usersCount > 0) {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir um grupo que possui usuários vinculados.",
        },
        { status: 400 },
      );
    }

    await prisma.accessGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir grupo." },
      { status: 500 },
    );
  }
}
