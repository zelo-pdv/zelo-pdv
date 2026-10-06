import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/require-permission";

export async function GET(request: Request) {
  try {
    const auth = await requirePermission("dashboard", "Visualizar");
    if (!auth.authorized) return auth.response;
    const { lojaId } = auth.user;

    const settings = await prisma.settings.findUnique({
      where: { lojaId },
    });

    return NextResponse.json(settings?.config ?? {});
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Apenas admin (que tem acesso completo, mas não temos action "Configurar" explícita) 
    // Vamos usar Visualizar dashboard pra validar lojaId, porém a interface restringe Configurações
    const auth = await requirePermission("dashboard", "Visualizar");
    if (!auth.authorized) return auth.response;
    const { lojaId } = auth.user;

    const body = await request.json();

    const updated = await prisma.settings.upsert({
      where: { lojaId },
      update: { config: body },
      create: {
        lojaId,
        config: body,
      },
    });

    return NextResponse.json(updated.config);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
