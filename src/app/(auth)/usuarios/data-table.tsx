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
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
} from "lucide-react";
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
import type { UserTableData } from "./columns";

export function UsersDataTable({
  columns,
  data,
  groups,
  onCreateClick,
}: {
  columns: ColumnDef<UserTableData>[];
  data: UserTableData[];
  groups: { id: string; name: string }[];
  onCreateClick: () => void;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [groupFilter, setGroupFilter] = useState("Todos");
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

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant={
                    statusFilter !== "Todos" || groupFilter !== "Todos"
                      ? "default"
                      : "outline"
                  }
                  size="icon"
                  className="rounded-xl shrink-0"
                >
                  <ListFilter className="h-4 w-4" />
                </Button>
              }
            ></PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Status
                </label>
                <div className="flex flex-col gap-1">
                  {["Todos", "Ativo", "Inativo"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${statusFilter === s ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Escopo
                </label>
                <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                  <button
                    onClick={() => setGroupFilter("Todos")}
                    className={`rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${groupFilter === "Todos" ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"}`}
                  >
                    Todos
                  </button>
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGroupFilter(g.name)}
                      className={`rounded-lg px-3 py-1.5 text-sm text-left transition-colors ${groupFilter === g.name ? "bg-secondary text-secondary-foreground" : "hover:bg-accent"}`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

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
