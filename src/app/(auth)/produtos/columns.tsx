import type { ColumnDef } from "@tanstack/react-table";

import {
  AlertTriangle,
  ArrowUpDown,
  MoreVertical,
  PackagePlus,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { currency } from "@/lib/format";
import { ProductThumb } from "@/components/product-thumb";

import type { Category, Product } from "@/prisma/client";

import type { PermissionChecker } from "@/types/permissions";

export type ProductFrontend = Omit<Product, "costPrice" | "salePrice"> & {
  costPrice: number;
  salePrice: number;
  category?: Category | null;
};

export type ProductActions = {
  onStock: (product: ProductFrontend) => void;
  onEdit: (product: ProductFrontend) => void;
  onDelete: (product: ProductFrontend) => void;
  can: PermissionChecker;
};

export function getProductColumns({
  onStock,
  onEdit,
  onDelete,
  can,
}: ProductActions): ColumnDef<ProductFrontend>[] {
  const canStock = can("produtos", "Editar");
  const canEdit = can("produtos", "Editar");
  const canDelete = can("produtos", "Excluir");

  const hasAnyAction = canStock || canEdit || canDelete;

  const columns: ColumnDef<ProductFrontend>[] = [
    {
      accessorKey: "name",

      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 px-2 hover:bg-none focus:bg-none"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Produto
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),

      cell: ({ row }) => {
        const product = row.original;
        const low =
          (product.minStock ?? 0) > 0 &&
          product.stock <= (product.minStock ?? 0);

        const hasMobileActions = hasAnyAction;

        return (
          <div className="min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2.5 min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
                <ProductThumb
                  name={product.name}
                  image={product.image}
                  className="h-9 w-9 rounded-lg text-xs shrink-0"
                />
                <div className="min-w-0 flex items-center gap-1.5 flex-1">
                  <span className="truncate text-sm font-medium">
                    {product.name}
                  </span>

                  {low && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-500/40 text-amber-700 text-[10px] px-1 h-4"
                    >
                      <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                      Baixo
                    </Badge>
                  )}
                </div>
              </div>

              {hasMobileActions && (
                <div className="sm:hidden shrink-0">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                    />

                    <PopoverContent className="w-52" align="end">
                      {canStock && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            onStock(product);
                          }}
                        >
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Entrada de estoque
                        </Button>
                      )}

                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(product);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar produto
                        </Button>
                      )}

                      {canStock && canEdit && canDelete && (
                        <Separator className="my-1" />
                      )}

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-full justify-start px-3 text-destructive hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(product);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover produto
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
              {product.stock} un · {currency(product.salePrice)}
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "category",

      header: "Categoria",

      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category?.name || "Sem categoria"}
        </span>
      ),

      filterFn: (row, _id, value) => row.original.category?.name === value,
    },

    {
      accessorKey: "stock",

      header: () => <div className="text-right">Estoque</div>,

      cell: ({ row }) => (
        <div className="text-right text-sm tabular-nums">
          {row.original.stock} un
        </div>
      ),
    },

    {
      accessorKey: "salePrice",

      header: () => <div className="text-right">Valor</div>,

      cell: ({ row }) => (
        <div className="text-right text-sm font-semibold tabular-nums">
          {currency(row.original.salePrice)}
        </div>
      ),
    },
  ];

  if (hasAnyAction) {
    columns.push({
      id: "actions",

      header: () => <div className="text-right">Ações</div>,

      enableHiding: false,

      cell: ({ row }) => {
        const product = row.original;

        return (
          <div className="hidden justify-end gap-1 sm:flex">
            {canStock && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onStock(product)}
                aria-label="Entrada de estoque"
              >
                <PackagePlus className="h-4 w-4" />
              </Button>
            )}

            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onEdit(product)}
                aria-label="Editar produto"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}

            {canDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(product)}
                aria-label="Remover produto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    });
  }

  return columns;
}
