import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-permission";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const units = await prisma.unit.findMany({
      where: { lojaId: user.lojaId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(units);
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const body = await req.json();
    const { name, abbreviation, decimalPlaces } = body;

    if (!name || !abbreviation) {
      return NextResponse.json(
        { error: "Nome e abreviação são obrigatórios" },
        { status: 400 },
      );
    }

    const newUnit = await prisma.unit.create({
      data: {
        name,
        abbreviation,
        decimalPlaces: decimalPlaces || 0,
        lojaId: user.lojaId,
      },
    });

    return NextResponse.json(newUnit, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Já existe uma unidade com este nome ou abreviação." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
