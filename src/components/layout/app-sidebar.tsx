"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { NAV, SECONDARY_NAV } from "@/lib/navigation-data";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePermissions } from "@/components/auth/permissions-provider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, isAdmin } = usePermissions();

  const visibleNav = NAV.filter(
    (item) => !item.module || can(item.module, "Visualizar"),
  );

  const visibleSecondaryNav = SECONDARY_NAV.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="mb-6">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <Image
                src="/zelo.jpeg"
                alt="Zelo PDV"
                width={32}
                height={32}
                className="size-8 rounded-lg object-contain shrink-0"
              />
              <span className="text-base font-bold text-foreground tracking-tight">
                ZELO
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => {
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem className="pb-1" key={item.to}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      render={
                        <Link href={item.to}>
                          {<item.icon />}
                          <span>{item.label}</span>
                        </Link>
                      }
                      className={
                        active ? "bg-primary text-primary-foreground" : ""
                      }
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSecondaryNav.map((item) => {
                const active = isActive(item.to);
                return (
                  <SidebarMenuItem className="pb-1" key={item.to}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      render={
                        <Link href={item.to}>
                          {<item.icon />}
                          <span>{item.label}</span>
                        </Link>
                      }
                      className={
                        active ? "bg-primary text-primary-foreground" : ""
                      }
                    ></SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  variant="outline"
                  onClick={async () => {
                    await fetch("/api/auth/logout", {
                      method: "POST",
                    });

                    router.push("/login");
                    router.refresh();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
