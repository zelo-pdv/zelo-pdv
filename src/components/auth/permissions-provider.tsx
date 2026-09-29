"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { hasPermission } from "@/lib/permissions";

import type {
  ActionKey,
  ModuleKey,
  Permissions,
} from "@/store/useSettingsStore";

interface PermissionsContextValue {
  permissions: Permissions;
  isAdmin: boolean;
  can: (module: ModuleKey, action: ActionKey) => boolean;
  user?: {
    sub: string;
    email: string;
    name: string;
    groupName?: string;
    isAdmin?: boolean;
  };
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  permissions: Permissions;
  user?: {
    sub: string;
    email: string;
    name: string;
    groupName?: string;
    isAdmin?: boolean;
  };
  children: ReactNode;
}

export function PermissionsProvider({
  permissions,
  user,
  children,
}: PermissionsProviderProps) {
  const isAdmin = Boolean(user?.isAdmin || user?.groupName === "ADMIN");

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      isAdmin,
      user,
      can: (module, action) => hasPermission(permissions, module, action, isAdmin),
    }),
    [permissions, user, isAdmin],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error(
      "usePermissions deve ser usado dentro de PermissionsProvider.",
    );
  }

  return context;
}
