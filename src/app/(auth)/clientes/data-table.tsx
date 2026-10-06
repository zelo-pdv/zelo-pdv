"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ClientTableData } from "./columns";

export function ClientsDataTable({
  columns,
  data,
  onCreateClick,
  canAdd,
  onImportClick,
  onExportClick,
  isExporting,
}: {
  columns: ColumnDef<ClientTableData>[];
  data: ClientTableData[];
  onCreateClick: () => void;
  canAdd?: boolean;
  onImportClick?: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [pendingFilter, setPendingFilter] = useState("Todos");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      const term = String(value).trim().toLowerCase();
      if (!term) return true;
      const c = row.original;
      return (
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  useEffect(() => {
    table
      .getColumn("active")
      ?.setFilterValue(activeFilter === "Todos" ? undefined : activeFilter);
  }, [activeFilter, table]);

  useEffect(() => {
    table
      .getColumn("pendingAmount")
      ?.setFilterValue(pendingFilter === "Todos" ? undefined : pendingFilter);
  }, [pendingFilter, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, activeFilter, pendingFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  const activeFiltersCount =
    (activeFilter !== "Todos" ? 1 : 0) + (pendingFilter !== "Todos" ? 1 : 0);

  const clearAllFilters = () => {
    setActiveFilter("Todos");
    setPendingFilter("Todos");
    setGlobalFilter("");
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <BoxIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
            <Input
              placeholder="Buscar clientes..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoComplete="new-password"
              name="search-table"
              id="search-table"
              className="rounded-xl pl-9"
            />
          </div>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant={activeFiltersCount > 0 ? "default" : "outline"}
                  className="rounded-xl shrink-0 gap-1.5 text-xs sm:text-sm font-medium"
                  aria-label="Abrir filtros"
                >
                  <BoxIcon name="slider-alt" className="text-base" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[11px] font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              }
            />
            <PopoverContent align="end" className="w-80 p-4 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-sm">Filtros de Clientes</span>
              </div>

              {/* Status de Cadastro */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Status de Cadastro
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={activeFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setActiveFilter("Todos")}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={activeFilter === "Ativos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
                    onClick={() => setActiveFilter("Ativos")}
                  >
                    Ativos
                  </Button>
                  <Button
                    type="button"
                    variant={activeFilter === "Inativos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setActiveFilter("Inativos")}
                  >
                    Inativos
                  </Button>
                </div>
              </div>

              {/* Pendências Financeiras */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Pendências Financeiras
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={pendingFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setPendingFilter("Todos")}
                  >
                    Todas
                  </Button>
                  <Button
                    type="button"
                    variant={pendingFilter === "Pendentes" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-amber-600 dark:text-amber-400"
                    onClick={() => setPendingFilter("Pendentes")}
                  >
                    Pendentes
                  </Button>
                  <Button
                    type="button"
                    variant={pendingFilter === "Pagos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setPendingFilter("Pagos")}
                  >
                    Em dia
                  </Button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs font-medium"
                  onClick={clearAllFilters}
                  disabled={activeFiltersCount === 0}
                >
                  Limpar dados
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onImportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onImportClick}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer"
            >
              <BoxIcon name="upload" className="text-base" />
              <span>Importar</span>
            </Button>
          )}

          {onExportClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={isExporting}
              className="rounded-full hidden sm:flex shrink-0 gap-1.5 cursor-pointer"
            >
              <BoxIcon name="download" className="text-base" />
              <span>{isExporting ? "Exportando..." : "Exportar"}</span>
            </Button>
          )}

          {canAdd !== false && (
            <Button
              type="button"
              onClick={onCreateClick}
              size="sm"
              className="rounded-full hidden sm:flex shrink-0 gap-1 cursor-pointer"
            >
              <BoxIcon name="plus" className="text-base" />
              <span>Adicionar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Badges de Filtros Ativos */}
      {activeFiltersCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Filtros ativos:</span>
          {activeFilter !== "Todos" && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Status: {activeFilter}
              <button
                type="button"
                onClick={() => setActiveFilter("Todos")}
                className="hover:text-destructive cursor-pointer rounded-full p-0.5"
              >
                <BoxIcon name="x" className="text-xs" />
              </button>
            </Badge>
          )}

          {pendingFilter !== "Todos" && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Pendência: {pendingFilter === "Pendentes" ? "Com pendências" : "Sem pendências"}
              <button
                type="button"
                onClick={() => setPendingFilter("Todos")}
                className="hover:text-destructive cursor-pointer rounded-full p-0.5"
              >
                <BoxIcon name="x" className="text-xs" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <Card className="border-border/70 p-0">
        <CardContent className="p-0">
          <div className="w-full overflow-x-hidden sm:overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.id === "name" ||
                          header.column.id === "actions"
                            ? undefined
                            : "hidden sm:table-cell"
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "name" ||
                            cell.column.id === "actions"
                              ? undefined
                              : "hidden sm:table-cell"
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {totalFiltered === 0 ? 0 : pageIndex * pageSize + 1}–
          {Math.min((pageIndex + 1) * pageSize, totalFiltered)} de{" "}
          {totalFiltered}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <BoxIcon name="chevron-left" className="text-base" />
          </Button>
          <div className="text-xs tabular-nums text-muted-foreground">
            {pageIndex + 1} / {table.getPageCount() || 1}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <BoxIcon name="chevron-right" className="text-base" />
          </Button>
        </div>
      </div>
    </div>
  );
}
