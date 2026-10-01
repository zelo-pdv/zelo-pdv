import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from "next/headers";
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

  const payload = await verifyJwtToken(token);
  if (!payload) {
    redirect("/login");
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
  try {
    const body = await req.json();
    const validatedData = schema.parse(body); 
    return await handler(validatedData);
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

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  // ==========================================
  // 1. RATE LIMITING
  // ==========================================
  const now = Date.now();
  const rlData = rateLimitMap.get(ip) ?? { count: 0, lastReset: now };

  if (now - rlData.lastReset > RATE_WINDOW) {
    rlData.count = 0;
    rlData.lastReset = now;
  }
  rlData.count++;
  rateLimitMap.set(ip, rlData);

  if (rlData.count > RATE_LIMIT) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  // ==========================================
  // 2. JWT VERIFICATION (PROXY)
  // ==========================================
  const protectedRoutes = ['/dashboard', '/configuracoes', '/historico', '/produtos', '/clientes', '/usuarios'];
  const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtected) {
    const token = request.cookies.get('token')?.value;
    if (!token || !(await verifyJwtToken(token))) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ==========================================
  // 3. SECURITY HEADERS E CACHE
  // ==========================================
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim();

  response.headers.set('Content-Security-Policy', contentSecurityPolicyHeaderValue);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
