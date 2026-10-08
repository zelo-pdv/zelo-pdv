import type { ColumnDef } from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, dateTime } from "@/lib/format";
import { getPaymentLabel, type Sale } from "@/types";

export type SaleActions = {
  onView: (s: Sale) => void;
  onVoucher: (s: Sale) => void;
  onEdit?: (s: Sale) => void;
  onCancel?: (s: Sale) => void;
};

export function getSaleColumns({
  onView,
  onVoucher,
  onEdit,
  onCancel,
}: SaleActions): ColumnDef<Sale>[] {
  return [
    {
      accessorKey: "clientName",
      header: "Cliente",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {s.clientName || "Consumidor Final"}
              </span>
              {s.status === "CANCELADO" && (
                <Badge
                  variant="outline"
                  className="sm:hidden text-[10px] px-1.5 py-0 border-destructive/40 text-destructive bg-destructive/10"
                >
                  Cancelado
                </Badge>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {dateTime(s.date)}
            </div>
            {/* Info resumida para Mobile */}
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
              <span>{getPaymentLabel(s.paymentMethod)}</span>
              <span>·</span>
              <span className={s.status === "CANCELADO" ? "line-through opacity-70" : "font-medium text-foreground"}>
                {currency(s.total)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Pagamento",
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground hidden sm:block">
          {getPaymentLabel(row.original.paymentMethod)}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Valor</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div
            className={`text-right text-sm font-semibold tabular-nums hidden sm:block ${
              s.status === "CANCELADO" ? "line-through text-muted-foreground opacity-70" : ""
            }`}
          >
            {currency(s.total)}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-right">Status</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="text-right hidden sm:block">
            <Badge
              variant={
                s.status === "PAGO"
                  ? "secondary"
                  : s.status === "CANCELADO"
                    ? "outline"
                    : "outline"
              }
              className={
                s.status === "PENDENTE"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-400"
                  : s.status === "CANCELADO"
                    ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/20 font-medium"
                    : ""
              }
            >
              {s.status === "PAGO"
                ? "Pago"
                : s.status === "CANCELADO"
                  ? "Cancelado"
                  : "Pendente"}
            </Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value === "all" || row.getValue(id) === value;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const s = row.original;
        const isCancelled = s.status === "CANCELADO";

        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onView(s)}
              aria-label="Ver detalhes"
              title="Ver detalhes"
            >
              <BoxIcon name="show" className="text-base" />
            </Button>
            {!isCancelled && onEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-foreground/80 hover:text-foreground"
                onClick={() => onEdit(s)}
                aria-label="Editar venda"
                title="Editar venda"
              >
                <BoxIcon name="edit-alt" className="text-base" />
              </Button>
            )}
            {!isCancelled && onCancel && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onCancel(s)}
                aria-label="Cancelar venda"
                title="Cancelar venda"
              >
                <BoxIcon name="x-circle" className="text-base" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onVoucher(s)}
              aria-label="Ver comprovante"
              title="Ver comprovante"
            >
              <BoxIcon name="receipt" className="text-base" />
            </Button>
          </div>
        );
      },
    },
  ];
}
