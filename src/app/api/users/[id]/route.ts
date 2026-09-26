import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcrypt";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("E-mail inválido").optional(),
  password: z
    .string()
    .min(6, "A senha deve ter no mínimo 6 caracteres")
    .optional()
    .or(z.literal("")),
  groupId: z.string().min(1, "Grupo é obrigatório").optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const updateData = { ...data };

    if (!updateData.password) {
      delete updateData.password;
    } else {
      updateData.password = await hash(updateData.password, 10);
    }

    const user = await prisma.user.update({
      where: { id, lojaId: currentUser.lojaId },
      data: updateData,
      include: { group: true },
    });

    if (id === currentUser.id) {
      const { cookies } = await import("next/headers");
      const { SignJWT } = await import("jose");

      const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        permissions: user.group?.permissions || {},
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(JWT_SECRET);

      const cookieStore = await cookies();

      cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      const contextBase64 = Buffer.from(JSON.stringify(payload)).toString(
        "base64",
      );
      cookieStore.set("user_context", contextBase64, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
    }

    const safeUser = { ...user };
    delete (safeUser as { password?: string }).password;

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? "Dados inválidos" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser)
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { id } = await params;

    const firstUser = await prisma.user.findFirst({
      where: { lojaId: currentUser.lojaId },
      orderBy: { createdAt: "asc" },
    });

    if (firstUser && firstUser.id === id) {
      return NextResponse.json(
        { error: "O primeiro usuário da loja não pode ser deletado." },
        { status: 403 },
      );
    }

    await prisma.user.delete({ where: { id, lojaId: currentUser.lojaId } });
    return NextResponse.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    return NextResponse.json(
      { error: "Erro ao deletar usuário" },
      { status: 500 },
    );
  }
}
