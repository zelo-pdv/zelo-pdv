"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/navigation-data";
import { usePermissions } from "@/components/auth/permissions-provider";

export function BottomNavigation() {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleNav = NAV.filter(
    (n) => !n.module || can(n.module, "Visualizar"),
  );

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 backdrop-blur-lg md:hidden">
      <div
        className="mx-auto grid max-w-lg pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, visibleNav.length)}, minmax(0, 1fr))`,
        }}
      >
        {visibleNav.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.to);
          if (n.primary) {
            return (
              <Link
                key={n.to}
                href={n.to}
                className="relative flex items-center justify-center"
                aria-label={n.label}
              >
                <span
                  className={cn(
                    "-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-lg shadow-black/10 dark:shadow-white/10 transition-transform active:scale-95",
                    active && "ring-4 ring-zinc-300 dark:ring-zinc-700",
                  )}
                >
                  <Icon active={active} className="text-2xl text-white dark:text-zinc-900" />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={n.to}
              href={n.to}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors",
                active ? "text-zinc-900 dark:text-zinc-50 font-semibold" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon active={active} className={cn("text-xl", active ? "text-black dark:text-white" : "text-muted-foreground")} />
              {n.short}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
