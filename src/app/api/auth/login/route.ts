import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { withValidation } from "../../../../../proxy";
import { JWT_SECRET } from "@/lib/jwt-secret";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.success) return rateLimit.response;

  // Padronização e sanitização com Zod
  return withValidation(loginSchema, req, async (data) => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { group: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 401 });
    }

    const senhaValida = await bcrypt.compare(password, user.password);

    if (!senhaValida) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: "Este usuário está inativo." }, { status: 403 });
    }

    const firstUser = await prisma.user.findFirst({
      where: { lojaId: user.lojaId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    const isFirstUser = firstUser?.id === user.id;
    const isAdmin = user.group?.name === "ADMIN" || isFirstUser;

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
      sameSite: "strict", // Strict para proteção máxima CSRF
      path: "/",
      maxAge: 60 * 60 * 8, // 8h
    });

    const contextBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    cookieStore.set("user_context", contextBase64, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", 
      path: "/",
      maxAge: 60 * 60 * 8, // 8h
    });

    return NextResponse.json({ success: true, user: payload });
  });
}
