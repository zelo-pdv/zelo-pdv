import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import type { ActionKey, ModuleKey } from "@/store/useSettingsStore";

export async function requirePermission(module: ModuleKey, action: ActionKey) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 },
      ),
    };
  }

  if (!user.isAdmin && !hasPermission(user.permissions, module, action)) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        {
          error: "Você não possui permissão para realizar esta ação.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true as const,
    user,
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 },
      ),
    };
  }

  if (!user.isAdmin) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        {
          error: "Acesso restrito ao administrador.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    authorized: true as const,
    user,
  };
}
