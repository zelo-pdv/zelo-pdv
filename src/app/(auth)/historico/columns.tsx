import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency, dateTime } from "@/lib/format";
import { PAYMENT_LABELS, type Sale } from "@/types";

export type SaleActions = {
  onView: (s: Sale) => void;
  onVoucher: (s: Sale) => void;
};

export function getSaleColumns({
  onView,
  onVoucher,
}: SaleActions): ColumnDef<Sale>[] {
  return [
    {
      accessorKey: "clientName",
      header: "Cliente",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
            <div className="truncate text-sm font-medium">
              {s.clientName || "Consumidor Final"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {dateTime(s.date)}
            </div>
            {/* Info resumida para Mobile */}
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
              <span>{PAYMENT_LABELS[s.paymentMethod]}</span>
              <span>·</span>
              <span className="font-medium text-foreground">
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
          {PAYMENT_LABELS[row.original.paymentMethod]}
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Valor</div>,
      cell: ({ row }) => (
        <div className="text-right text-sm font-semibold tabular-nums hidden sm:block">
          {currency(row.original.total)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: () => <div className="text-right">Status</div>,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="text-right hidden sm:block">
            <Badge
              variant={s.status === "PAGO" ? "secondary" : "outline"}
              className={
                s.status === "PENDENTE"
                  ? "border-amber-500/40 text-amber-700"
                  : ""
              }
            >
              {s.status === "PAGO" ? "Pago" : "Pendente"}
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
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onView(s)}
              aria-label="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onVoucher(s)}
              aria-label="Ver comprovante"
            >
              <Receipt className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}
