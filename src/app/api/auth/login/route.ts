import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";
import { setAuthCookies } from "@/lib/cookies";
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
      include: { group: true, loja: { select: { ownerId: true } } },
    });

    console.log("LOGIN ATTEMPT - EMAIL:", email, "USER FOUND:", !!user);

    let senhaValida = false;
    if (user) {
      senhaValida = await bcrypt.compare(password, user.password);
    } else {
      // Dummy hash comparation to mitigate timing attacks for non-existent users
      await bcrypt.compare(password, "$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa");
    }

    if (!user || !senhaValida) {
      // Generic message to prevent user enumeration
      return NextResponse.json({ error: "Credenciais inválidas." }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: "Este usuário está inativo." }, { status: 403 });
    }

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

    await setAuthCookies(token, payload);

    return NextResponse.json({ success: true, user: payload });
  });
}
