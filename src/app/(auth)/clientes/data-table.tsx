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
import { ChevronLeft, ChevronRight, ListFilter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
}: {
  columns: ColumnDef<ClientTableData>[];
  data: ClientTableData[];
  onCreateClick: () => void;
  canAdd?: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [pendingFilter, setPendingFilter] = useState("Todos");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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

  const isFilterActive = activeFilter !== "Todos" || pendingFilter !== "Todos";

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={isFilterActive ? "default" : "outline"}
                  size="icon"
                  className="rounded-xl shrink-0"
                  aria-label="Filtrar clientes"
                >
                  <ListFilter className="h-4 w-4" />
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2 space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                  Status de Cadastro
                </p>
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant={activeFilter === "Todos" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs"
                    onClick={() => setActiveFilter("Todos")}
                  >
                    Todos os status
                  </Button>
                  <Button
                    variant={activeFilter === "Ativos" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs text-emerald-600 dark:text-emerald-400"
                    onClick={() => setActiveFilter("Ativos")}
                  >
                    Apenas ativos
                  </Button>
                  <Button
                    variant={activeFilter === "Inativos" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs text-muted-foreground"
                    onClick={() => setActiveFilter("Inativos")}
                  >
                    Apenas inativos
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
                  Pendências Financeiras
                </p>
                <div className="flex flex-col gap-0.5">
                  <Button
                    variant={pendingFilter === "Todos" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs"
                    onClick={() => setPendingFilter("Todos")}
                  >
                    Todas as situações
                  </Button>
                  <Button
                    variant={pendingFilter === "Pendentes" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs text-amber-600 dark:text-amber-400"
                    onClick={() => setPendingFilter("Pendentes")}
                  >
                    Com pendências
                  </Button>
                  <Button
                    variant={pendingFilter === "Pagos" ? "secondary" : "ghost"}
                    size="sm"
                    className="justify-start h-8 text-xs"
                    onClick={() => setPendingFilter("Pagos")}
                  >
                    Sem pendências
                  </Button>
                </div>
              </div>

              {isFilterActive && (
                <>
                  <Separator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                    onClick={() => {
                      setActiveFilter("Todos");
                      setPendingFilter("Todos");
                    }}
                  >
                    Limpar filtros
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canAdd !== false && (
            <>
              <Button
                onClick={onCreateClick}
                size="lg"
                className="w-full rounded-full sm:hidden"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
              <Button
                onClick={onCreateClick}
                size="sm"
                className="rounded-full hidden sm:flex shrink-0"
              >
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </>
          )}
        </div>
      </div>

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
            <ChevronLeft className="h-4 w-4" />
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
