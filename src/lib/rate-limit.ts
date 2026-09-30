import { NextResponse } from "next/server";

interface RateLimitStore {
  [ip: string]: { count: number; expiresAt: number };
}

const store: RateLimitStore = {};

const WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 10; // Limite padrão por janela

export function checkRateLimit(
  req: Request, 
  maxRequests = MAX_REQUESTS, 
  windowMs = WINDOW_MS
): { success: boolean; response?: NextResponse } {
  // Captura IP do cabeçalho
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp || "unknown";

  const now = Date.now();
  
  // Limpeza de entradas expiradas esporadicamente para evitar memory leak
  if (Math.random() < 0.05) { 
    for (const key in store) {
      if (store[key].expiresAt < now) {
        delete store[key];
      }
    }
  }

  const record = store[ip];
  if (record && record.expiresAt > now) {
    if (record.count >= maxRequests) {
      return { 
        success: false, 
        response: NextResponse.json(
          { error: "Muitas requisições. Tente novamente mais tarde." }, 
          { status: 429 }
        ) 
      };
    }
    record.count++;
  } else {
    store[ip] = { count: 1, expiresAt: now + windowMs };
  }

  return { success: true };
}
