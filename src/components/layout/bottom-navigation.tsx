"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/navigation-data";
import { usePermissions } from "@/components/auth/permissions-provider";

import { createBoxIcon } from "@/components/ui/box-icon";

export function BottomNavigation() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleNav = NAV.filter(
    (n) => !n.module || can(n.module, "Visualizar"),
  ).map((n) => {
    if (n.to === "/historico") {
      return {
        ...n,
        to: "/mais",
        label: "Mais",
        short: "Mais",
        icon: createBoxIcon("menu"),
      };
    }
    return n;
  });

  // Se tiver somente um item (ou nenhum), não precisa mostrar a navegação
  if (visibleNav.length <= 1) {
    return null;
  }

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  // Ajusta o espaçamento/largura máxima dependendo de se há 2, 3, 4 ou 5 itens
  const getMaxWidthClass = (count: number) => {
    switch (count) {
      case 2:
        return "max-w-xs";
      case 3:
        return "max-w-sm";
      case 4:
        return "max-w-md";
      default:
        return "max-w-lg";
    }
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <div
        className={cn(
          "mx-auto grid pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 transition-all",
          getMaxWidthClass(visibleNav.length),
        )}
        style={{
          gridTemplateColumns: `repeat(${visibleNav.length}, minmax(0, 1fr))`,
        }}
      >
        {visibleNav.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.to);
          return (
            <Link
              key={n.to}
              href={n.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                active={active}
                className={cn(
                  "text-xl",
                  active ? "text-black dark:text-white" : "text-muted-foreground",
                )}
              />
              {n.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
