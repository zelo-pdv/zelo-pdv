"use client";

import { useEffect, useState } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { UserTableData } from "./columns";

export function UsersDataTable({
  columns,
  data,
  groups,
  onCreateClick,
  onExportClick,
  isExporting,
}: {
  columns: ColumnDef<UserTableData>[];
  data: UserTableData[];
  groups: { id: string; name: string }[];
  onCreateClick: () => void;
  onExportClick?: () => void;
  isExporting?: boolean;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [groupFilter, setGroupFilter] = useState("Todos");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      const term = String(value).trim().toLowerCase();
      if (!term) return true;
      const u = row.original;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      columnVisibility: { active: false },
    },
  });

  // Sincroniza os filtros com as colunas da tabela
  useEffect(() => {
    table
      .getColumn("groupLabel")
      ?.setFilterValue(groupFilter === "Todos" ? undefined : groupFilter);
    table
      .getColumn("active")
      ?.setFilterValue(
        statusFilter === "Todos" ? undefined : statusFilter === "Ativo",
      );
  }, [statusFilter, groupFilter, table]);

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, statusFilter, groupFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const activeFiltersCount =
    (statusFilter !== "Todos" ? 1 : 0) + (groupFilter !== "Todos" ? 1 : 0);

  const clearAllFilters = () => {
    setStatusFilter("Todos");
    setGroupFilter("Todos");
    setGlobalFilter("");
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 w-full sm:flex-1">
          <div className="relative w-full sm:w-[40%] sm:max-w-[40%] min-w-0">
            <BoxIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              autoComplete="new-password"
              name="search-table"
              id="search-table"
              className="rounded-xl pl-9 w-full"
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
                <span className="font-semibold text-sm">Filtros de Usuários</span>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Status
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={statusFilter === "Todos" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter("Todos")}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Ativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-emerald-600 dark:text-emerald-400"
                    onClick={() => setStatusFilter("Ativo")}
                  >
                    Ativo
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "Inativo" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => setStatusFilter("Inativo")}
                  >
                    Inativo
                  </Button>
                </div>
              </div>

              {/* Grupo de Acesso */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Grupo de Acesso
                </Label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="Todos">Todos os grupos</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
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

          <Button
            type="button"
            onClick={onCreateClick}
            size="sm"
            className="rounded-full hidden sm:flex shrink-0 gap-1 cursor-pointer"
          >
            <BoxIcon name="plus" className="text-base" />
            <span>Adicionar</span>
          </Button>
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
                          header.column.id === "name"
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
                            cell.column.id === "name"
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
                      Nenhum usuário encontrado.
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
