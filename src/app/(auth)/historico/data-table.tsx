"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { PAYMENT_LABELS, PaymentMethod, type Sale, SaleStatus } from "@/types";
import { currency, dateTime } from "@/lib/format";
import { toast } from "sonner";

export function SalesDataTable({
  columns,
  data,
}: {
  columns: ColumnDef<Sale>[];
  data: Sale[];
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<
    "all" | "today" | "7days" | "30days" | "thisMonth" | "custom"
  >("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filtra os dados com base nos filtros selecionados (Itens #18, #19, #20)
  const filteredData = useMemo(() => {
    return data.filter((sale) => {
      // 1. Status da Venda (Item #20)
      if (statusFilter !== "all" && sale.status !== statusFilter) {
        return false;
      }

      // 2. Método de Pagamento (Item #18)
      if (paymentFilter !== "all" && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      // 3. Período / Datas (Item #19)
      const saleTime = new Date(sale.date).getTime();
      const saleDate = new Date(sale.date);

      if (datePreset === "today") {
        const today = new Date();
        if (
          saleDate.getDate() !== today.getDate() ||
          saleDate.getMonth() !== today.getMonth() ||
          saleDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      } else if (datePreset === "7days") {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (saleTime < cutoff) return false;
      } else if (datePreset === "30days") {
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (saleTime < cutoff) return false;
      } else if (datePreset === "thisMonth") {
        const today = new Date();
        if (
          saleDate.getMonth() !== today.getMonth() ||
          saleDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      } else if (datePreset === "custom") {
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          if (saleTime < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59`).getTime();
          if (saleTime > end) return false;
        }
      }

      return true;
    });
  }, [data, statusFilter, paymentFilter, datePreset, startDate, endDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (paymentFilter !== "all") count++;
    if (datePreset !== "all") count++;
    return count;
  }, [statusFilter, paymentFilter, datePreset]);

  const clearAllFilters = () => {
    setStatusFilter("all");
    setPaymentFilter("all");
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
    setGlobalFilter("");
  };

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
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
  }, [globalFilter, statusFilter, paymentFilter, datePreset, startDate, endDate, table]);

  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  // Item #21: Exportação para CSV
  const handleExportCSV = () => {
    const rowsToExport = table.getFilteredRowModel().rows.map((r) => r.original);
    if (rowsToExport.length === 0) {
      toast.warning("Nenhuma venda encontrada para exportar.");
      return;
    }

    const headers = [
      "ID da Venda",
      "Data e Hora",
      "Cliente",
      "Forma de Pagamento",
      "Status",
      "Desconto",
      "Total",
    ];

    const csvRows = rowsToExport.map((s) => [
      s.id,
      dateTime(s.date),
      s.clientName || "Consumidor Final",
      PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
      s.status === "PAGO" ? "Pago" : "Pendente",
      s.discount ? currency(s.discount) : "R$ 0,00",
      currency(s.total),
    ]);

    // UTF-8 BOM e delimitador ; para compatibilidade nativa com Excel no Brasil
    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
        ),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_zelo_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${rowsToExport.length} venda(s) exportada(s) com sucesso!`);
  };

  const datePresetLabels: Record<string, string> = {
    today: "Hoje",
    "7days": "Últimos 7 dias",
    "30days": "Últimos 30 dias",
    thisMonth: "Este mês",
    custom: "Personalizado",
  };

  return (
    <div>
      {/* Barra de Busca, Filtros e Exportação */}
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="rounded-xl pl-9"
            />
          </div>

          {/* Botão de Filtros (Popover) */}
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant={activeFiltersCount > 0 ? "default" : "outline"}
                  className="rounded-xl shrink-0 gap-1.5 text-xs sm:text-sm font-medium"
                  aria-label="Abrir filtros"
                >
                  <SlidersHorizontal className="h-4 w-4" />
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
                <span className="font-semibold text-sm">Filtros de Vendas</span>
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                  >
                    Limpar todos
                  </button>
                )}
              </div>

              {/* Item #20: Filtro por Status */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter("all")}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === SaleStatus.PAGO ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter(SaleStatus.PAGO)}
                  >
                    Pagas
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === SaleStatus.PENDENTE ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setStatusFilter(SaleStatus.PENDENTE)}
                  >
                    Pendentes
                  </Button>
                </div>
              </div>

              {/* Item #18: Filtro por Forma de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Forma de Pagamento
                </Label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="all">Todas as formas</option>
                  {Object.values(PaymentMethod).map((pm) => (
                    <option key={pm} value={pm}>
                      {PAYMENT_LABELS[pm] || pm}
                    </option>
                  ))}
                </select>
              </div>

              {/* Item #19: Filtro por Período */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Período
                </Label>
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    type="button"
                    variant={datePreset === "all" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("all")}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "today" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("today")}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "7days" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("7days")}
                  >
                    7 dias
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "30days" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("30days")}
                  >
                    30 dias
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "thisMonth" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("thisMonth")}
                  >
                    Este mês
                  </Button>
                  <Button
                    type="button"
                    variant={datePreset === "custom" ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDatePreset("custom")}
                  >
                    Personalizado
                  </Button>
                </div>

                {datePreset === "custom" && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Início
                      </span>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">
                        Fim
                      </span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Concluir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Item #21: Botão Exportar CSV */}
        <Button
          variant="outline"
          onClick={handleExportCSV}
          className="rounded-xl shrink-0 gap-1.5 text-xs sm:text-sm font-medium hover:bg-primary/5"
          title="Exportar vendas filtradas para arquivo CSV"
        >
          <Download className="h-4 w-4 text-primary" />
          <span>Exportar CSV</span>
        </Button>
      </div>

      {/* Badges de Filtros Ativos */}
      {activeFiltersCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Filtros ativos:</span>
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Status: {statusFilter === SaleStatus.PAGO ? "Pagas" : "Pendentes"}
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="hover:text-destructive cursor-pointer rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {paymentFilter !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Pagamento: {PAYMENT_LABELS[paymentFilter as PaymentMethod] || paymentFilter}
              <button
                type="button"
                onClick={() => setPaymentFilter("all")}
                className="hover:text-destructive cursor-pointer rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {datePreset !== "all" && (
            <Badge variant="secondary" className="gap-1 pr-1 font-normal">
              Período:{" "}
              {datePreset === "custom"
                ? `${startDate || "..."} até ${endDate || "..."}`
                : datePresetLabels[datePreset] || datePreset}
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="hover:text-destructive cursor-pointer rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar todos
          </Button>
        </div>
      )}

      {/* Tabela de Vendas */}
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

      {/* Paginação */}
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
