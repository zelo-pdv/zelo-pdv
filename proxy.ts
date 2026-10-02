import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";
import { z } from "zod";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 60; // Máximo de 60 requisições
const RATE_WINDOW = 60 * 1000; // a cada 1 minuto

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export async function verifyJwtToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}

// Função para proteger ROTAS PRIVADAS (Node.js runtime / Server Components)
export async function requireAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = await verifyJwtToken(token) as any;
  if (!payload) {
    redirect("/login");
  }

  // Authorization check inside requireAuth
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || headersList.get("referer") || "";
  
  if (!payload.isAdmin) {
    let moduleName = "";
    if (pathname.includes("/dashboard")) moduleName = "dashboard";
    else if (pathname.includes("/configuracoes")) moduleName = "configuracoes";
    else if (pathname.includes("/historico")) moduleName = "historico";
    else if (pathname.includes("/produtos")) moduleName = "produtos";
    else if (pathname.includes("/clientes")) moduleName = "clientes";
    else if (pathname.includes("/usuarios")) moduleName = "usuarios";
    else if (pathname.includes("/nova-venda")) moduleName = "nova-venda";

    if (moduleName) {
      const hasViewPermission = Array.isArray(payload.permissions?.[moduleName]) && payload.permissions[moduleName].includes("Visualizar");
      if (!hasViewPermission) {
        if (moduleName === "dashboard") {
          const sequence = ["produtos", "nova-venda", "clientes", "historico", "configuracoes"];
          const found = sequence.find((mod) => payload.permissions?.[mod]?.includes("Visualizar"));
          if (found) {
            redirect(`/${found}`);
          } else {
            redirect("/login");
          }
        }
        redirect("/dashboard");
      }
    }
  }

  return { token, user: payload };
}

// Função para proteger ROTAS PÚBLICAS (ex: página de login)
export async function requireGuest() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    const payload = (await verifyJwtToken(token)) as any;
    if (payload) {
      if (payload.isAdmin) {
        redirect("/dashboard");
      }
      const sequence = [
        { module: "dashboard", to: "/dashboard" },
        { module: "produtos", to: "/produtos" },
        { module: "nova-venda", to: "/nova-venda" },
        { module: "clientes", to: "/clientes" },
        { module: "historico", to: "/historico" },
      ];
      const found = sequence.find((item) =>
        payload.permissions?.[item.module]?.includes("Visualizar")
      );
      redirect(found?.to || "/dashboard");
    }
  }
}

// Wrapper para validação estrita com Zod em Route Handlers
export async function withValidation<T>(
  schema: z.ZodSchema<T>,
  req: Request,
  handler: (data: T) => Promise<NextResponse>
) {
  // Rate Limiting
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();
  const rlData = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };

  if (now - rlData.lastReset > RATE_WINDOW) {
    rlData.count = 0;
    rlData.lastReset = now;
  }
  rlData.count++;
  rateLimitMap.set(ip, rlData);

  if (rlData.count > RATE_LIMIT) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const validatedData = schema.parse(body); 
    const response = await handler(validatedData);
    
    // Set security headers on the API response
    response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;");
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
