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
import { ChevronLeft, ChevronRight, Search, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Sale } from "@/types";

export function SalesDataTable({
  columns,
  data,
}: {
  columns: ColumnDef<Sale>[];
  data: Sale[];
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("Todas");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: (row, _id, value) => {
      const term = String(value).trim().toLowerCase();
      if (!term) return true;
      const clientName = row.original.clientName || "Consumidor Final";
      return clientName.toLowerCase().includes(term);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 8 } },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, statusFilter, table]);

  // Sincroniza o Select com o Filtro da Coluna
  useEffect(() => {
    table
      .getColumn("status")
      ?.setFilterValue(statusFilter === "Todas" ? undefined : statusFilter);
  }, [statusFilter, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar vendas..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={statusFilter !== "Todas" ? "default" : "outline"}
                  size="icon"
                  className="rounded-xl shrink-0"
                  aria-label="Filtrar status"
                >
                  <ListFilter className="h-4 w-4" />
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <div className="flex flex-col gap-0.5">
                <Button
                  variant={statusFilter === "Todas" ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => setStatusFilter("Todas")}
                >
                  Todas as vendas
                </Button>
                <Button
                  variant={statusFilter === "paid" ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => setStatusFilter("paid")}
                >
                  Pagas
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => setStatusFilter("pending")}
                >
                  Pendentes
                </Button>
              </div>
            </PopoverContent>
          </Popover>
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
                          header.column.id === "clientName" ||
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
                            cell.column.id === "clientName" ||
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
                      Nenhuma venda encontrada.
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
