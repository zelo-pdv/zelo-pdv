import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
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
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const users = await prisma.user.findMany({
      where: { lojaId: user.lojaId },
      include: { group: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
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
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const message = zodError.issues?.[0]?.message ?? "Erro de validação";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
