"use client";

import {
  SettingsIcon,
  Sun,
  Moon,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePermissions } from "@/components/auth/permissions-provider";

export default function SettingsItem() {
  const router = useRouter();
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
            <SettingsIcon />
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
              <Sun className="mr-2 h-4 w-4" />
            ) : (
              <Moon className="mr-2 h-4 w-4" />
            )}
            {resolvedTheme === "dark" ? "Tema claro" : "Tema escuro"}
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem
                render={
                  <Link href="/usuarios">
                    <UserCog className="mr-2 h-4 w-4" />
                    Usuários
                  </Link>
                }
              />

              <DropdownMenuItem
                render={
                  <Link href="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                }
              />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
              });

              router.push("/login");
              router.refresh();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
