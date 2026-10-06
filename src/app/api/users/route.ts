import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-permission";
import { checkEmailConflict, checkPhoneConflict } from "@/lib/validations/uniqueness";

const userSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  phone: z.string().optional().nullable(),
  groupId: z.string().min(1, "Grupo é obrigatório"),
  active: z.boolean().default(true),
});

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const user = auth.user;

    const users = await prisma.user.findMany({
      where: { lojaId: user.lojaId },
      include: { group: true },
      orderBy: { createdAt: "desc" },
    });
    
    const safeUsers = users.map((u) => {
      const safeUser = { ...u } as Record<string, unknown>;
      delete safeUser.password;
      return safeUser;
    });
    
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json(
      { error: "Erro ao buscar usuários" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;
    const currentUser = auth.user;

    const body = await request.json();
    const data = userSchema.parse(body);

    // Validação cruzada de unicidade de e-mail
    const emailConflict = await checkEmailConflict({
      email: data.email,
      lojaId: currentUser.lojaId,
    });
    if (emailConflict) {
      return NextResponse.json({ error: emailConflict }, { status: 400 });
    }

    // Validação cruzada de unicidade de telefone
    if (data.phone && data.phone.trim() !== "") {
      const phoneConflict = await checkPhoneConflict({
        phone: data.phone,
        lojaId: currentUser.lojaId,
      });
      if (phoneConflict) {
        return NextResponse.json({ error: phoneConflict }, { status: 400 });
      }
    }

    // Validação se o grupo pertence à loja do usuário
    const existingGroup = await prisma.accessGroup.findFirst({
      where: { id: data.groupId, lojaId: currentUser.lojaId },
    });
    if (!existingGroup) {
      return NextResponse.json({ error: "Grupo inválido ou não pertence à loja." }, { status: 400 });
    }

    const hashedPassword = await hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.trim().toLowerCase(),
        phone: data.phone ? data.phone.trim() : null,
        password: hashedPassword,
        groupId: data.groupId,
        active: data.active,
        lojaId: currentUser.lojaId,
      },
      include: { group: true },
    });

    const safeUser = { ...user } as Record<string, unknown>;
    delete safeUser.password;

    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const message = zodError.issues?.[0]?.message ?? "Erro de validação";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if ((error as any)?.code === "P2002") {
      return NextResponse.json(
        { error: "Este e-mail está indisponível." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
