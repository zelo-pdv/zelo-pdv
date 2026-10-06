"use client";

import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePermissions } from "@/components/auth/permissions-provider";

export default function SettingsItem() {
  const { setTheme, resolvedTheme } = useTheme();
  const { isAdmin } = usePermissions();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline">
            <BoxIcon name="cog" className="text-lg text-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Menu</DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => {
              toggleTheme();
            }}
          >
            {isDark ? (
              <BoxIcon name="sun" className="mr-2 text-base text-foreground" />
            ) : (
              <BoxIcon name="moon" solid className="mr-2 text-base text-foreground" />
            )}
            {resolvedTheme === "dark" ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem
                render={
                  <Link href="/usuarios">
                    <BoxIcon name="user-pin" className="mr-2 text-base text-foreground" />
                    Usuários
                  </Link>
                }
              />

              <DropdownMenuItem
                render={
                  <Link href="/configuracoes">
                    <BoxIcon name="cog" className="mr-2 text-base text-foreground" />
                    Configurações
                  </Link>
                }
              />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-testid="logout-button"
            className="text-destructive focus:text-destructive"
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
              });

              window.location.href = "/login";
            }}
          >
            <BoxIcon name="log-out" className="mr-2 text-base text-destructive" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
