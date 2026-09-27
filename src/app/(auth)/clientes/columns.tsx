import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { currency, initials } from "@/lib/format";
import { ClientWithAddress } from "@/types";
import { maskPhone } from "@/lib/masks";

export type ClientTableData = ClientWithAddress & {
  totalSpent: number;
  pendingAmount: number;
};

export type ClientActions = {
  onView: (c: ClientWithAddress) => void;
  onEdit: (c: ClientWithAddress) => void;
  onDelete: (c: ClientWithAddress) => void;
  can: (module: "clientes", action: "Visualizar" | "Adicionar" | "Editar" | "Excluir") => boolean;
};

export function getClientColumns({
  onView,
  onEdit,
  onDelete,
  can,
}: ClientActions): ColumnDef<ClientTableData>[] {
  return [
    {
      accessorKey: "name",
      header: "Cliente",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {initials(c.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {maskPhone(c.phone)}
              </div>
              {/* Info resumida para Mobile (escondida no desktop) */}
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
                <span className="font-medium text-foreground">
                  {currency(c.totalSpent)}
                </span>
                {c.pendingAmount > 0 && (
                  <Badge
                    variant="outline"
                    className="h-4 border-amber-500/40 px-1 text-[10px] text-amber-700"
                  >
                    Pendente
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "totalSpent",
      header: () => <div className="text-right">Total Gasto</div>,
      cell: ({ row }) => (
        <div className="text-right text-sm font-semibold tabular-nums hidden sm:block">
          {currency(row.original.totalSpent)}
        </div>
      ),
    },
    {
      accessorKey: "pendingAmount",
      header: () => <div className="text-right">Pendente</div>,
      filterFn: (row, id, value) => {
        const val = row.getValue(id) as number;
        if (value === "Pendentes") return val > 0;
        if (value === "Pagos") return val === 0;
        return true;
      },
      cell: ({ row }) => {
        const val = row.original.pendingAmount;
        return (
          <div className="text-right hidden sm:block">
            {val > 0 ? (
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-700"
              >
                {currency(val)}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onView(c)}
              aria-label="Ver detalhes"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {can("clientes", "Editar") && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit(c)}
                aria-label="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {can("clientes", "Excluir") && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(c)}
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
