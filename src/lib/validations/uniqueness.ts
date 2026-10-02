import prisma from "@/lib/prisma";

export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  // Se contiver DDI 55 (ex: 5511999999999 ou 557999999999), remove o 55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits;
}

export async function checkEmailConflict({
  email,
  lojaId,
  excludeUserId,
  excludeClientId,
}: {
  email?: string | null;
  lojaId: string;
  excludeUserId?: string;
  excludeClientId?: string;
}): Promise<string | null> {
  if (!email || !email.trim()) return null;

  const cleanEmail = email.trim().toLowerCase();

  // 1. Verifica se já existe um Usuário com esse e-mail na MESMA loja
  const existingUser = await prisma.user.findFirst({
    where: {
      lojaId,
      email: {
        equals: cleanEmail,
        mode: "insensitive",
      },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });

  if (existingUser) {
    return "Este e-mail já está sendo utilizado por um usuário na sua loja.";
  }

  // 2. Verifica se já existe um Cliente com esse e-mail na loja
  const existingClient = await prisma.client.findFirst({
    where: {
      lojaId,
      email: {
        equals: cleanEmail,
        mode: "insensitive",
      },
      ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
    },
  });

  if (existingClient) {
    return "Este e-mail já está sendo utilizado por outro cliente.";
  }

  return null;
}

export async function checkPhoneConflict({
  phone,
  lojaId,
  excludeUserId,
  excludeClientId,
}: {
  phone?: string | null;
  lojaId: string;
  excludeUserId?: string;
  excludeClientId?: string;
}): Promise<string | null> {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 8) return null;

  // 1. Verifica conflito com Usuários da loja (ou sistema)
  const usersWithPhone = await prisma.user.findMany({
    where: {
      lojaId,
      phone: { not: null },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true, phone: true },
  });

  for (const u of usersWithPhone) {
    if (normalizePhone(u.phone) === cleanPhone) {
      return "Este telefone já está sendo utilizado por um usuário do sistema.";
    }
  }

  // 2. Verifica conflito com Clientes da loja
  const clientsWithPhone = await prisma.client.findMany({
    where: {
      lojaId,
      phone: { not: "" },
      ...(excludeClientId ? { id: { not: excludeClientId } } : {}),
    },
    select: { id: true, name: true, phone: true },
  });

  for (const c of clientsWithPhone) {
    // Ignorar "Consumidor Final" se tiver telefone vazio
    if (normalizePhone(c.phone) === cleanPhone) {
      return "Este telefone já está sendo utilizado por outro cliente.";
    }
  }

  return null;
}
