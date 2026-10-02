import { cookies } from "next/headers";

const TOKEN_MAX_AGE = 60 * 60 * 8; // 8h

export async function setAuthCookies(token: string, payload: any) {
  const cookieStore = await cookies();

  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // Strict para proteção máxima CSRF
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });

  const contextBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  cookieStore.set("user_context", contextBase64, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", 
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export async function deleteAuthCookies() {
  const cookieStore = await cookies();
  
  cookieStore.delete({
    name: "token",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  
  cookieStore.delete({
    name: "user_context",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
}
