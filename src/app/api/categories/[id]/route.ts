import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission("produtos", "Editar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const resolvedParams = await params;
    const body = await req.json();
    const { name } = body;

    const category = await prisma.category.updateMany({
      where: { id: resolvedParams.id, lojaId: user.lojaId },
      data: { name },
    });

    if (category.count === 0) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requirePermission("produtos", "Excluir");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const resolvedParams = await params;
    const category = await prisma.category.deleteMany({
      where: { id: resolvedParams.id, lojaId: user.lojaId },
    });

    if (category.count === 0) {
      return NextResponse.json(
        { error: "Categoria não encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir esta categoria porque ela está em uso por produtos.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
