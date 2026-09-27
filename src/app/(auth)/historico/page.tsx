"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GlobalLoader } from "@/components/ui/global-loader";
import { SaleVoucher } from "@/components/sale-voucher";
import { useVouchersStore, voucherCode } from "@/store/useVouchersStore";
import { currency, dateTime } from "@/lib/format";
import { PAYMENT_LABELS, type Sale } from "@/types";
import { salesService } from "@/services/sales.service";
import { getSaleColumns } from "./columns";
import { SalesDataTable } from "./data-table";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync } from "@/hooks/use-data-sync";

export default function HistoricoPage() {
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const addVoucher = useVouchersStore((s) => s.addVoucher);

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const fetchedSales = await salesService.list();
      setSales(fetchedSales);
    } catch (error) {
      if (!silent) {
        toast.error("Erro ao carregar o histórico de vendas.");
      }
      console.error("Erro ao carregar vendas:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!can("historico", "Visualizar")) {
      setIsLoading(false);
      return;
    }
    refreshData(false);
  }, [can]);

  // Sincronização em tempo real do histórico de vendas
  useDataSync({
    types: ["sales"],
    onSync: () => {
      refreshData(true);
    },
    enabled: can("historico", "Visualizar"),
  });

  // Ordena as vendas da mais recente para a mais antiga
  const sortedSales = useMemo(() => {
    return [...sales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sales]);

  const [detail, setDetail] = useState<Sale | null>(null);
  const [voucherState, setVoucherState] = useState<{
    sale: Sale;
    phone?: string;
  } | null>(null);

  useEffect(() => {
    if (sales.length > 0 && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const saleId = params.get("saleId");
      if (saleId) {
        const found = sales.find((s) => s.id === saleId);
        if (found) {
          setDetail(found);
        }
        window.history.replaceState(null, "", "/historico");
      }
    }
  }, [sales]);

  const columns = useMemo(
    () =>
      getSaleColumns({
        onView: setDetail,
        onVoucher: (sale) => {
          // Ao clicar em ver comprovante, salva no store e abre o modal
          addVoucher({
            saleId: sale.id,
            code: voucherCode(sale.id),
            sale,
          });
          setVoucherState({ sale });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!can("historico", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />
        <p className="text-sm font-medium">Você não tem permissão para visualizar o histórico.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <SalesDataTable columns={columns} data={sortedSales} />

      {/* Modal/Drawer de Detalhes da Venda */}
      {isMobile ? (
        <Drawer open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DrawerContent className="max-h-[90vh] p-4">
            <DrawerHeader className="px-0">
              <DrawerTitle>Detalhes da venda</DrawerTitle>
            </DrawerHeader>
            {detail && (
              <div className="space-y-3 overflow-y-auto min-h-0 flex-1 py-2">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-sm font-medium">{detail.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {dateTime(detail.date)}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-semibold text-muted-foreground">
                    Itens
                  </h4>
                  <div className="space-y-1">
                    {detail.items.map((it) => (
                      <div
                        key={it.productId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0 truncate pr-2">
                          {it.quantity}× {it.productName}
                        </div>
                        <div className="tabular-nums">
                          {currency(it.unitPrice * it.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {currency(detail.total)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{PAYMENT_LABELS[detail.paymentMethod]}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={detail.status === "PAGO" ? "secondary" : "outline"}
                    className={
                      detail.status === "PENDENTE"
                        ? "border-amber-500/40 text-amber-700"
                        : ""
                    }
                  >
                    {detail.status === "PAGO" ? "Pago" : "Pendente"}
                  </Badge>
                </div>

                {detail.dueDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>
                      {new Date(detail.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}

                {detail.notes && (
                  <div className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    {detail.notes}
                  </div>
                )}

                <Button
                  className="w-full rounded-full"
                  onClick={() => {
                    addVoucher({
                      saleId: detail.id,
                      code: voucherCode(detail.id),
                      sale: detail,
                    });
                    setVoucherState({ sale: detail });
                    setDetail(null);
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" /> Ver comprovante
                </Button>
              </div>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalhes da venda</DialogTitle>
            </DialogHeader>
            {detail && (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-sm font-medium">{detail.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {dateTime(detail.date)}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-xs font-semibold text-muted-foreground">
                    Itens
                  </h4>
                  <div className="space-y-1">
                    {detail.items.map((it) => (
                      <div
                        key={it.productId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0 truncate pr-2">
                          {it.quantity}× {it.productName}
                        </div>
                        <div className="tabular-nums">
                          {currency(it.unitPrice * it.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold tabular-nums">
                    {currency(detail.total)}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{PAYMENT_LABELS[detail.paymentMethod]}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={detail.status === "PAGO" ? "secondary" : "outline"}
                    className={
                      detail.status === "PENDENTE"
                        ? "border-amber-500/40 text-amber-700"
                        : ""
                    }
                  >
                    {detail.status === "PAGO" ? "Pago" : "Pendente"}
                  </Badge>
                </div>

                {detail.dueDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>
                      {new Date(detail.dueDate).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}

                {detail.notes && (
                  <div className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    {detail.notes}
                  </div>
                )}

                <Button
                  className="w-full rounded-full"
                  onClick={() => {
                    addVoucher({
                      saleId: detail.id,
                      code: voucherCode(detail.id),
                      sale: detail,
                    });
                    setVoucherState({ sale: detail });
                    setDetail(null); // Fecha o de detalhes e abre o de comprovante
                  }}
                >
                  <Receipt className="mr-2 h-4 w-4" /> Ver comprovante
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Modal do Comprovante */}
      <SaleVoucher
        sale={voucherState?.sale ?? null}
        open={!!voucherState}
        clientPhone={voucherState?.phone}
        onClose={() => setVoucherState(null)}
      />
    </div>
  );
}
