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
import { BoxIcon } from "@/components/ui/box-icon";
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
      <SidebarHeader className="mb-4 p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-2.5">
        <div className="flex items-center gap-2.5 px-2 py-1.5 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center select-none">
          <div className="relative shrink-0 flex items-center justify-center">
            <Image
              src="/zelo-black.png"
              alt="Zelo PDV"
              width={48}
              height={48}
              priority
              className="size-9 group-data-[collapsible=icon]:size-10.5 object-contain dark:hidden transition-all duration-200"
            />
            <Image
              src="/zelo-white.png"
              alt="Zelo PDV"
              width={48}
              height={48}
              priority
              className="size-9 group-data-[collapsible=icon]:size-10.5 object-contain hidden dark:block transition-all duration-200"
            />
          </div>
          <span className="text-[1.35rem] font-bold text-foreground tracking-tight translate-y-1.5 group-data-[collapsible=icon]:hidden">
            Zelo
          </span>
        </div>
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
                        <Link href={item.to} className="flex items-center gap-3 w-full">
                          <item.icon
                            active={active}
                            className={
                              active
                                ? "text-[1.25rem] text-black dark:text-white"
                                : "text-[1.25rem] text-muted-foreground group-hover/menu-button:text-foreground"
                            }
                          />
                          <span>{item.label}</span>
                        </Link>
                      }
                      className={
                        active
                          ? "bg-zinc-100 text-zinc-900 font-semibold dark:bg-zinc-800 dark:text-zinc-50"
                          : "text-muted-foreground hover:text-foreground"
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
                        <Link href={item.to} className="flex items-center gap-3 w-full">
                          <item.icon
                            active={active}
                            className={
                              active
                                ? "text-[1.25rem] text-black dark:text-white"
                                : "text-[1.25rem] text-muted-foreground group-hover/menu-button:text-foreground"
                            }
                          />
                          <span>{item.label}</span>
                        </Link>
                      }
                      className={
                        active
                          ? "bg-zinc-100 text-zinc-900 font-semibold dark:bg-zinc-800 dark:text-zinc-50"
                          : "text-muted-foreground hover:text-foreground"
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
                  className="text-muted-foreground hover:text-foreground"
                >
                  <BoxIcon name="log-out" className="text-[1.15rem] text-muted-foreground" />
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
