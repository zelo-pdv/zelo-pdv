"use client";

import { useState, type ReactNode } from "react";
import { PermissionsProvider } from "./permissions-provider";
import { useDataSync } from "@/hooks/use-data-sync";

import type { Permissions } from "@/store/useSettingsStore";

interface UserContext {
  permissions?: Permissions;
  sub?: string;
  email?: string;
  name?: string;
  groupName?: string;
  isAdmin?: boolean;
}

function getUserContext(): UserContext | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("user_context="));

  if (!cookie) {
    return null;
  }

  try {
    const value = decodeURIComponent(cookie.substring("user_context=".length));

    const binaryString = atob(value);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);

    return JSON.parse(decoded) as UserContext;
  } catch {
    return null;
  }
}

export function PermissionsProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [context, setContext] = useState<UserContext | null>(() => getUserContext());

  useDataSync({
    types: ["session"],
    onSync: async (changed, versions) => {
      if (changed.includes("session") && versions?.session) {
        try {
          const newSession = JSON.parse(versions.session);
          
          if (!newSession.active) {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login"; // Redirect to login if user deactivated
            return;
          }

          setContext((prev) => ({
            ...prev,
            permissions: newSession.permissions,
            groupName: newSession.groupName,
            isAdmin: newSession.isAdmin,
          }));
        } catch (e) {
          console.error("Erro ao sincronizar sessão:", e);
        }
      }
    },
  });

  const permissions = context?.permissions ?? {};
  const user = context?.sub
    ? {
        sub: context.sub,
        email: context.email || "",
        name: context.name || "",
        groupName: context.groupName,
        isAdmin: context.isAdmin,
      }
    : undefined;

  return (
    <PermissionsProvider permissions={permissions} user={user}>
      {children}
    </PermissionsProvider>
  );
}
