import type { ColumnDef } from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency } from "@/lib/format";
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
  onToggleActive: (c: ClientWithAddress) => void;
  can: (module: "clientes", action: "Visualizar" | "Adicionar" | "Editar" | "Excluir") => boolean;
};

export function getClientColumns({
  onView,
  onEdit,
  onDelete,
  onToggleActive,
  can,
}: ClientActions): ColumnDef<ClientTableData>[] {
  return [
    {
      accessorKey: "name",
      header: "Cliente",
      cell: ({ row }) => {
        const c = row.original;
        const active = c.active ?? true;
        return (
          <div className="min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
            <div className="flex items-center gap-1.5 truncate">
              <span className="truncate text-sm font-medium">{c.name}</span>
              {!active && (
                <Badge
                  variant="outline"
                  className="h-4 border-muted-foreground/40 px-1 text-[10px] text-muted-foreground shrink-0"
                >
                  Inativo
                </Badge>
              )}
            </div>
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
        );
      },
    },
    {
      accessorKey: "active",
      header: "Status",
      filterFn: (row, _id, value) => {
        if (value === "Todos" || !value) return true;
        const active = row.original.active ?? true;
        if (value === "Ativos") return active === true;
        if (value === "Inativos") return active === false;
        return true;
      },
      cell: ({ row }) => {
        const active = row.original.active ?? true;
        return (
          <div className="hidden sm:block">
            <Badge
              variant="outline"
              className={
                active
                  ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10 text-xs"
                  : "border-muted-foreground/40 text-muted-foreground bg-muted/40 text-xs"
              }
            >
              {active ? "Ativo" : "Inativo"}
            </Badge>
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
        const active = c.active ?? true;
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onView(c)}
              aria-label="Ver detalhes"
              title="Ver detalhes"
            >
              <BoxIcon name="show" className="text-base" />
            </Button>
            {can("clientes", "Editar") && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className={
                    !active
                      ? "h-8 w-8 text-emerald-600 hover:text-emerald-700"
                      : "h-8 w-8 text-muted-foreground hover:text-foreground"
                  }
                  onClick={() => onToggleActive(c)}
                  aria-label={!active ? "Ativar cliente" : "Desativar cliente"}
                  title={!active ? "Ativar cliente" : "Desativar cliente"}
                >
                  <BoxIcon name="power-off" className="text-base" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onEdit(c)}
                  aria-label="Editar"
                  title="Editar cliente"
                >
                  <BoxIcon name="pencil" className="text-base" />
                </Button>
              </>
            )}
            {can("clientes", "Excluir") && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(c)}
                aria-label="Excluir"
                title="Excluir cliente"
              >
                <BoxIcon name="trash" className="text-base" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
