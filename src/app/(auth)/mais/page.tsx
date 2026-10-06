"use client";

import Link from "next/link";
import { usePermissions } from "@/components/auth/permissions-provider";
import { NAV, SECONDARY_NAV } from "@/lib/navigation-data";
import { BoxIcon } from "@/components/ui/box-icon";
import { ChevronRight } from "lucide-react";

export default function MaisPage() {
  const { can, isAdmin } = usePermissions();

  const historicoLink = NAV.find((n) => n.to === "/historico");

  const links = [
    ...(historicoLink && (!historicoLink.module || can(historicoLink.module, "Visualizar")) ? [historicoLink] : []),
    ...SECONDARY_NAV.filter((n) => !n.adminOnly || isAdmin),
  ];

  return (
    <div className="w-full px-4 py-4 max-w-2xl mx-auto space-y-4 pb-24 md:hidden">
      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              href={link.to}
              className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-sm border text-foreground hover:bg-accent transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="text-xl text-primary" />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{link.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          );
        })}
        
        <button
          data-testid="logout-button"
          onClick={async () => {
            await fetch("/api/auth/logout", {
              method: "POST",
            });
            window.location.href = "/login";
          }}
          className="flex w-full items-center gap-4 rounded-xl bg-card p-4 shadow-sm border text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <BoxIcon name="log-out" className="text-xl text-red-600" />
          </div>
          <div className="flex flex-1 flex-col text-left">
            <span className="text-sm font-medium">Sair</span>
          </div>
        </button>
      </div>
    </div>
  );
}
