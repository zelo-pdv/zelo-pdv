if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: A variável de ambiente JWT_SECRET é obrigatória e não foi definida.");
}

export const JWT_SECRET_RAW = process.env.JWT_SECRET;
export const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_RAW);
