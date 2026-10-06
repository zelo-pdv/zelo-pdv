import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardConfigModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const dashboard = useSettingsStore((s) => s.dashboard) ?? {
    defaultPeriod: "today",
    recentSalesCount: 5,
    hideLowStockCard: false,
    hideRecentSales: false,
  };
  const setDashboardSettings = useSettingsStore((s) => s.setDashboardSettings);

  const content = (
    <div className="space-y-4 pt-4">
      {/* Período de referência padrão dos cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
        <div className="space-y-0.5 pr-4">
          <Label className="text-sm font-medium">
            Período padrão dos cards
          </Label>
          <p className="text-xs text-muted-foreground">
            Define o período padrão exibido nos cards de métricas do dashboard ao entrar no sistema.
          </p>
        </div>
        <div className="shrink-0">
          <select
            value={dashboard.defaultPeriod || "today"}
            onChange={(e) => {
              const val = e.target.value as "today" | "week" | "month";
              setDashboardSettings({ defaultPeriod: val });
              toast.success("Período padrão do dashboard atualizado");
            }}
            className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="today">Hoje (Dia atual)</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Este mês</option>
          </select>
        </div>
      </div>

      {/* Ocultar seção de Estoque Baixo */}
      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-border/70 p-4 transition-opacity",
          !trackStock && "opacity-50 pointer-events-none"
        )}
      >
        <div className="space-y-0.5 pr-4">
          <Label
            className="text-sm font-medium cursor-pointer"
            htmlFor="toggle-hide-low-stock"
          >
            Ocultar seção de estoque baixo
          </Label>
          <p className="text-xs text-muted-foreground">
            {!trackStock
              ? "Controle de estoque desativado nas configurações de produtos (seção já ocultada automaticamente)."
              : "Oculta o card e a lista de produtos com estoque baixo no dashboard."}
          </p>
        </div>
        <Switch
          id="toggle-hide-low-stock"
          disabled={!trackStock}
          checked={!trackStock || dashboard.hideLowStockCard}
          onCheckedChange={(checked) => {
            setDashboardSettings({ hideLowStockCard: checked });
            if (checked) {
              toast.info("Seção de estoque baixo ocultada no dashboard");
            } else {
              toast.success("Seção de estoque baixo visível no dashboard");
            }
          }}
        />
      </div>

      {/* Ocultar seção de últimas vendas */}
      <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
        <div className="space-y-0.5 pr-4">
          <Label
            className="text-sm font-medium cursor-pointer"
            htmlFor="toggle-hide-recent-sales"
          >
            Ocultar seção de últimas vendas
          </Label>
          <p className="text-xs text-muted-foreground">
            Oculta a lista de vendas recentes no dashboard.
          </p>
        </div>
        <Switch
          id="toggle-hide-recent-sales"
          checked={Boolean(dashboard.hideRecentSales)}
          onCheckedChange={(checked) => {
            setDashboardSettings({ hideRecentSales: checked });
            if (checked) {
              toast.info("Seção de últimas vendas ocultada no dashboard");
            } else {
              toast.success("Seção de últimas vendas visível no dashboard");
            }
          }}
        />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
        <DrawerContent className="p-4 max-h-[85vh] overflow-y-auto">
          <DrawerHeader className="px-0">
            <DrawerTitle>Configurações do Dashboard</DrawerTitle>
            <DrawerDescription>Personalize a exibição do seu painel</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurações do Dashboard</DialogTitle>
          <DialogDescription>Personalize a exibição do seu painel</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
