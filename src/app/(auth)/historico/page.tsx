"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
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
import { currency, dateTime, formatDateOnly } from "@/lib/format";
import { getPaymentLabel, type Sale, SaleStatus } from "@/types";
import { apiRequest } from "@/lib/api-request";
import { salesService, cancelSale } from "@/services/sales.service";
import { getSaleColumns } from "./columns";
import { SalesDataTable } from "./data-table";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";

export default function HistoricoPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const addVoucher = useVouchersStore((s) => s.addVoucher);

  const handleMarkAsPaid = async (saleId: string) => {
    try {
      setIsUpdatingStatus(true);
      await salesService.updateStatus(saleId, SaleStatus.PAGO);
      toast.success("Venda marcada como paga com sucesso!");
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleId ? { ...s, status: SaleStatus.PAGO } : s,
        ),
      );
      setDetail((prev) =>
        prev && prev.id === saleId
          ? { ...prev, status: SaleStatus.PAGO }
          : prev,
      );
      notifyLocalSync("sales");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status da venda.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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

  const detailSubtotal = useMemo(() => {
    if (!detail) return 0;
    return detail.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  }, [detail]);

  const detailDiscount = useMemo(() => {
    if (!detail) return 0;
    if (typeof detail.discount === "number" && detail.discount > 0) {
      return detail.discount;
    }
    const diff = detailSubtotal - Number(detail.total);
    return diff > 0.01 ? diff : 0;
  }, [detail, detailSubtotal]);

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

  const handleEditSale = (sale: Sale) => {
    if (sale.status === SaleStatus.CANCELADO) {
      toast.error("Vendas canceladas não podem ser editadas.");
      return;
    }
    if (!can("historico", "Editar")) {
      toast.error("Você não tem permissão para editar vendas.");
      return;
    }

    const editDraft = {
      editingSaleId: sale.id,
      editingSaleNumber: sale.saleNumber,
      items: sale.items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
      })),
      client: sale.clientId
        ? {
            id: sale.clientId,
            name: sale.clientName || "",
            phone: "",
          }
        : null,
      discountType: "fixed" as const,
      discountValue: sale.discount ? String(sale.discount) : "",
      notes: sale.notes || "",
      payment: sale.paymentMethod,
      status: sale.status,
      dueDate: sale.dueDate ? formatDateOnly(sale.dueDate) : "",
    };

    try {
      localStorage.setItem("zelo_cart_draft", JSON.stringify(editDraft));
      toast.info(`Carregando venda #${sale.saleNumber || sale.id.slice(-6)} para edição...`);
      router.push("/nova-venda");
    } catch {
      toast.error("Erro ao preparar venda para edição.");
    }
  };

  const handleConfirmCancelSale = async () => {
    if (!saleToCancel) return;
    try {
      setIsUpdatingStatus(true);
      if (typeof salesService?.cancel === "function") {
        await salesService.cancel(saleToCancel.id);
      } else if (typeof cancelSale === "function") {
        await cancelSale(saleToCancel.id);
      } else if (typeof (salesService as any)?.updateStatus === "function") {
        await (salesService as any).updateStatus(saleToCancel.id, SaleStatus.CANCELADO);
      } else {
        await apiRequest(`/sales/${saleToCancel.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "CANCELADO" }),
        });
      }
      toast.success(
        `Venda #${saleToCancel.saleNumber || saleToCancel.id.slice(-6)} cancelada com sucesso! O estoque foi restabelecido.`,
      );
      setSales((prev) =>
        prev.map((s) =>
          s.id === saleToCancel.id ? { ...s, status: SaleStatus.CANCELADO } : s,
        ),
      );
      setDetail((prev) =>
        prev && prev.id === saleToCancel.id
          ? { ...prev, status: SaleStatus.CANCELADO }
          : prev,
      );
      notifyLocalSync("sales");
      notifyLocalSync("products");
      setSaleToCancel(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar venda.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
        onEdit: can("historico", "Editar") ? handleEditSale : undefined,
        onCancel: can("historico", "Editar") ? (sale) => setSaleToCancel(sale) : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, addVoucher],
  );

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!can("historico", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <BoxIcon name="error" className="text-5xl text-destructive opacity-50" />
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

                {detailDiscount > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{currency(detailSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Desconto</span>
                      <span className="tabular-nums">- {currency(detailDiscount)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <div className="text-sm font-semibold">Total</div>
                      <div className="text-lg font-bold tabular-nums text-primary">
                        {currency(detail.total)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {currency(detail.total)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{getPaymentLabel(detail.paymentMethod)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      detail.status === "PAGO"
                        ? "secondary"
                        : detail.status === "CANCELADO"
                          ? "outline"
                          : "outline"
                    }
                    className={
                      detail.status === "PENDENTE"
                        ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
                        : detail.status === "CANCELADO"
                          ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium"
                          : ""
                    }
                  >
                    {detail.status === "PAGO"
                      ? "Pago"
                      : detail.status === "CANCELADO"
                        ? "Cancelado"
                        : "Pendente"}
                  </Badge>
                </div>

                {detail.status === "CANCELADO" && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive dark:bg-destructive/20">
                    <div className="font-semibold flex items-center gap-1.5">
                      <BoxIcon name="info-circle" className="text-base" /> Venda cancelada
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Os itens foram devolvidos ao estoque e o valor não compõe o faturamento.
                    </p>
                  </div>
                )}

                {detail.dueDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>
                      {formatDateOnly(detail.dueDate)}
                    </span>
                  </div>
                )}

                {detail.notes && (
                  <div className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    {detail.notes}
                  </div>
                )}

                {detail.status === "PENDENTE" && can("historico", "Editar") && (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-green-600/40 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500/40 dark:text-green-400 dark:hover:bg-green-950/40"
                    disabled={isUpdatingStatus}
                    onClick={() => handleMarkAsPaid(detail.id)}
                  >
                    {isUpdatingStatus ? (
                      <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />
                    ) : (
                      <BoxIcon name="check-circle" className="mr-2 text-base" />
                    )}
                    Marcar como pago
                  </Button>
                )}

                {detail.status !== "CANCELADO" && can("historico", "Editar") && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => {
                        handleEditSale(detail);
                        setDetail(null);
                      }}
                    >
                      <BoxIcon name="edit-alt" className="mr-2 text-base" /> Editar venda
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSaleToCancel(detail);
                      }}
                    >
                      <BoxIcon name="x-circle" className="mr-2 text-base" /> Cancelar venda
                    </Button>
                  </>
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
                  <BoxIcon name="receipt" className="mr-2 text-base" /> Ver comprovante
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

                {detailDiscount > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{currency(detailSubtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Desconto</span>
                      <span className="tabular-nums">- {currency(detailDiscount)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border">
                      <div className="text-sm font-semibold">Total</div>
                      <div className="text-lg font-bold tabular-nums text-primary">
                        {currency(detail.total)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {currency(detail.total)}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{getPaymentLabel(detail.paymentMethod)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant={
                      detail.status === "PAGO"
                        ? "secondary"
                        : detail.status === "CANCELADO"
                          ? "outline"
                          : "outline"
                    }
                    className={
                      detail.status === "PENDENTE"
                        ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
                        : detail.status === "CANCELADO"
                          ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium"
                          : ""
                    }
                  >
                    {detail.status === "PAGO"
                      ? "Pago"
                      : detail.status === "CANCELADO"
                        ? "Cancelado"
                        : "Pendente"}
                  </Badge>
                </div>

                {detail.status === "CANCELADO" && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive dark:bg-destructive/20">
                    <div className="font-semibold flex items-center gap-1.5">
                      <BoxIcon name="info-circle" className="text-base" /> Venda cancelada
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Os itens foram devolvidos ao estoque e o valor não compõe o faturamento.
                    </p>
                  </div>
                )}

                {detail.dueDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>
                      {formatDateOnly(detail.dueDate)}
                    </span>
                  </div>
                )}

                {detail.notes && (
                  <div className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    {detail.notes}
                  </div>
                )}

                {detail.status === "PENDENTE" && can("historico", "Editar") && (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-green-600/40 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500/40 dark:text-green-400 dark:hover:bg-green-950/40"
                    disabled={isUpdatingStatus}
                    onClick={() => handleMarkAsPaid(detail.id)}
                  >
                    {isUpdatingStatus ? (
                      <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />
                    ) : (
                      <BoxIcon name="check-circle" className="mr-2 text-base" />
                    )}
                    Marcar como pago
                  </Button>
                )}

                {detail.status !== "CANCELADO" && can("historico", "Editar") && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => {
                        handleEditSale(detail);
                        setDetail(null);
                      }}
                    >
                      <BoxIcon name="edit-alt" className="mr-2 text-base" /> Editar venda
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setSaleToCancel(detail);
                      }}
                    >
                      <BoxIcon name="x-circle" className="mr-2 text-base" /> Cancelar venda
                    </Button>
                  </>
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
                  <BoxIcon name="receipt" className="mr-2 text-base" /> Ver comprovante
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

      {/* Confirmação para Cancelar Venda */}
      <AlertDialog open={!!saleToCancel} onOpenChange={(o) => !o && setSaleToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente cancelar a venda #{saleToCancel?.saleNumber || saleToCancel?.id.slice(-6)}? Os produtos retornarão ao estoque e o valor de {saleToCancel ? currency(saleToCancel.total) : ""} não será mais contabilizado no faturamento. O registro permanecerá no histórico como Cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingStatus}>Voltar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isUpdatingStatus}
              onClick={handleConfirmCancelSale}
            >
              {isUpdatingStatus ? (
                <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />
              ) : (
                <BoxIcon name="x-circle" className="mr-2 text-base" />
              )}
              Confirmar cancelamento
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
