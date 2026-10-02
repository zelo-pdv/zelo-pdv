import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-permission";
import { accessGroupSchema } from "@/lib/validations/access-group";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const groups = await prisma.accessGroup.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Erro ao listar grupos de acesso:", error);
    return NextResponse.json(
      { error: "Erro ao listar grupos de acesso." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await request.json();
    
    const parsed = accessGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos: " + parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description, active, permissions } = parsed.data;

    const group = await prisma.accessGroup.create({
      data: {
        name,
        description,
        active,
        permissions,
        lojaId: user.lojaId,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe um grupo com este nome." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar grupo de acesso." },
      { status: 500 },
    );
  }
}
