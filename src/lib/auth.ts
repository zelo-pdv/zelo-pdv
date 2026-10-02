import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/prisma";
import type { Permissions } from "@/store/useSettingsStore";
import { JWT_SECRET } from "@/lib/jwt-secret";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  groupId: string | null;
  groupName: string;
  isAdmin: boolean;
  isOwner: boolean;
  permissions: Permissions;
  lojaId: string;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.sub) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      include: {
        group: true,
        loja: { select: { ownerId: true } },
      },
    });

    if (!user || !user.active) {
      return null;
    }

    if (!user.group || !user.group.active) {
      return null;
    }

    const isOwner = user.loja?.ownerId === user.id;
    const isAdmin = user.group.name === "ADMIN" || isOwner;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      groupId: user.groupId,
      groupName: user.group.name,
      isAdmin,
      isOwner,
      permissions: user.group.permissions as unknown as Permissions,
      lojaId: user.lojaId,
    };
  } catch (error) {
    console.error("Erro ao obter usuário autenticado:", error);
    return null;
  }
}
