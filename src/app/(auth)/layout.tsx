import { requireAuth } from "../../../proxy";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { PermissionsProviderWrapper } from "@/components/auth/permissions-provider-wrapper";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // O proxy entra em ação aqui: se não houver token, ele barra o acesso
  // e redireciona para o /login antes de renderizar qualquer componente da interface.
  await requireAuth();

  return (
    <PermissionsProviderWrapper>
      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 48)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col pb-24 md:pb-6">
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <BottomNavigation />
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProviderWrapper>
  );
}
