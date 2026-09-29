import { NextResponse } from "next/server";
import { categorySchema } from "../../../lib/validations/product";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const categories = await prisma.category.findMany({
      where: { active: true, lojaId: user.lojaId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission("produtos", "Adicionar");
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await request.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: { ...data, lojaId: user.lojaId },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos: " + error.issues[0].message },
        { status: 400 },
      );
    }
    if (error?.code === "P2002" && error?.meta?.target?.includes("name")) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao criar categoria." },
      { status: 500 },
    );
  }
}
