import { useState, useEffect } from "react";
import type { Permissions } from "@/store/useSettingsStore";
import { userContextSchema, type UserContextData } from "@/lib/validations/user_context";

export function useUserContext() {
  const [user, setUser] = useState<UserContextData | null>(null);

  useEffect(() => {
    // Lê o cookie "user_context" do navegador
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_context="));

    if (cookie) {
      try {
        const base64Value = cookie.split("=")[1];
        const jsonString = atob(base64Value); // Decodifica Base64
        const rawObj = JSON.parse(jsonString);
        
        const parsed = userContextSchema.safeParse(rawObj);
        if (parsed.success) {
          setUser(parsed.data);
        } else {
          console.error("Contexto de usuário inválido", parsed.error);
        }
      } catch (e) {
        console.error("Erro ao decodificar contexto do usuário", e);
      }
    }
  }, []);

  // Helper útil para checar permissões rapidamente
  const hasPermission = (module: keyof Permissions, action: string) => {
    if (!user?.permissions) return false;
    const moduleActions = user.permissions[module];
    return moduleActions?.includes(action as any) ?? false;
  };

  return { user, hasPermission };
}
