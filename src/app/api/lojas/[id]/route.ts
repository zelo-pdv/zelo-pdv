import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { lojaSchema } from "@/lib/validations/loja";
import { requireAdmin } from "@/lib/require-permission";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    if (auth.user.lojaId !== id) {
      return NextResponse.json(
        { error: "Acesso não autorizado para esta loja." },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validação com Zod no back-end
    const parsed = lojaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos: " + parsed.error.issues[0].message },
        { status: 400 },
      );
    }
    const { address, ...lojaData } = parsed.data;

    // Avoid Prisma unique constraint errors for empty strings
    if (lojaData.email === "") lojaData.email = null;
    if (lojaData.document === "") lojaData.document = null;

    if (address) {
      const hasAnyValue = Object.values(address).some(
        (v) => !!v && String(v).trim() !== "",
      );
      const existingAddress = await prisma.address.findFirst({
        where: { lojaId: id },
      });

      if (hasAnyValue) {
        if (existingAddress) {
          await prisma.address.update({
            where: { id: existingAddress.id },
            data: {
              street: address.street || "",
              number: address.number || "",
              complement: address.complement || "",
              neighborhood: address.neighborhood || "",
              city: address.city || "",
              state: address.state || "",
              zipCode: address.zipCode || "",
            },
          });
        } else {
          await prisma.address.create({
            data: {
              lojaId: id,
              street: address.street || "",
              number: address.number || "",
              complement: address.complement || "",
              neighborhood: address.neighborhood || "",
              city: address.city || "",
              state: address.state || "",
              zipCode: address.zipCode || "",
            },
          });
        }
      }
    }

    const updatedLoja = await prisma.loja.update({
      where: { id },
      data: lojaData,
      include: {
        address: true,
      },
    });

    const firstAddress =
      Array.isArray(updatedLoja.address) && updatedLoja.address.length > 0
        ? updatedLoja.address[0]
        : null;

    return NextResponse.json({
      ...updatedLoja,
      address: firstAddress,
    });
  } catch (error) {
    console.error("Erro ao atualizar loja:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar dados." },
      { status: 500 },
    );
  }
}
