import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcrypt";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-permission";
import { checkEmailConflict, checkPhoneConflict } from "@/lib/validations/uniqueness";

const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("E-mail inválido").optional(),
  phone: z.string().optional().nullable(),
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

    // Apenas administrador pode editar outros usuários
    if (!currentUser.isAdmin && currentUser.id !== id) {
      return NextResponse.json(
        { error: "Acesso restrito ao administrador." },
        { status: 403 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id, lojaId: currentUser.lojaId },
      include: { loja: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Usuário não-admin não pode alterar seu próprio grupo ou status
    if (!currentUser.isAdmin && (data.groupId !== undefined || data.active !== undefined)) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar grupo ou status." },
        { status: 403 },
      );
    }

    const isTargetOwner = targetUser.loja?.ownerId === targetUser.id;

    if (isTargetOwner) {
      if (currentUser.id !== targetUser.id) {
        return NextResponse.json(
          { error: "Apenas o proprietário pode alterar seus próprios dados." },
          { status: 403 },
        );
      }
      if (data.active === false) {
        return NextResponse.json(
          { error: "O proprietário não pode ser desativado." },
          { status: 403 },
        );
      }
      if (data.groupId && data.groupId !== targetUser.groupId) {
        // Prevent changing owner's group if it would remove their access, but for now we just don't let it be restricted without care
      }
    }

    if (data.email) {
      const emailConflict = await checkEmailConflict({
        email: data.email,
        lojaId: currentUser.lojaId,
        excludeUserId: id,
      });
      if (emailConflict) {
        return NextResponse.json({ error: emailConflict }, { status: 400 });
      }
    }

    if (data.phone && data.phone.trim() !== "") {
      const phoneConflict = await checkPhoneConflict({
        phone: data.phone,
        lojaId: currentUser.lojaId,
        excludeUserId: id,
      });
      if (phoneConflict) {
        return NextResponse.json({ error: phoneConflict }, { status: 400 });
      }
    }

    if (data.groupId) {
      const existingGroup = await prisma.accessGroup.findFirst({
        where: { id: data.groupId, lojaId: currentUser.lojaId },
      });
      if (!existingGroup) {
        return NextResponse.json(
          { error: "Grupo inválido ou não pertence à loja." },
          { status: 400 },
        );
      }
    }

    const updateData: any = { ...data };

    if (data.email) {
      updateData.email = data.email.trim().toLowerCase();
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone && data.phone.trim() !== "" ? data.phone.trim() : null;
    }

    if (!updateData.password) {
      delete updateData.password;
    } else {
      updateData.password = await hash(updateData.password, 10);
    }

    const user = await prisma.user.update({
      where: { id, lojaId: currentUser.lojaId },
      data: updateData,
      include: { group: true, loja: true },
    });

    if (id === currentUser.id) {
      const { cookies } = await import("next/headers");
      const { SignJWT } = await import("jose");

      const { JWT_SECRET } = await import("@/lib/jwt-secret");

      const isOwner = user.loja?.ownerId === user.id;
      const isAdmin = user.group?.name === "ADMIN" || isOwner;

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
        groupName: user.group?.name || "",
        isAdmin,
        permissions: user.group?.permissions || {},
      };

      const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("8h")
        .sign(JWT_SECRET);

      const cookieStore = await cookies();

      cookieStore.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
      });

      const contextBase64 = Buffer.from(JSON.stringify(payload)).toString(
        "base64",
      );
      cookieStore.set("user_context", contextBase64, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 8,
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
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Este e-mail está indisponível." },
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
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const currentUser = auth.user;

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id, lojaId: currentUser.lojaId },
      include: { loja: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado." },
        { status: 404 },
      );
    }

    if (targetUser.loja?.ownerId === targetUser.id) {
      return NextResponse.json(
        { error: "O proprietário da loja não pode ser deletado." },
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
