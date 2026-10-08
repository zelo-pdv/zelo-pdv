"use client";

import { useEffect, useState, useMemo } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currency, dateTime } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlobalLoader } from "@/components/ui/global-loader";
import { salesService } from "@/services/sales.service";
import { productsService } from "@/services/products.service";
import type { Sale } from "@/types";
import type { ProductFrontend } from "../produtos/columns";
import { handleExportLowStockPdf } from "@/lib/export";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync } from "@/hooks/use-data-sync";
import { cn } from "@/lib/utils";
import { useSettingsStore, DashboardPeriod } from "@/store/useSettingsStore";
import { getFirstAccessibleRoute } from "@/lib/navigation-data";
import { DashboardConfigModal } from "@/components/dashboard/dashboard-config-modal";

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "success" | "pending";
}) {
  return (
    <Card
      className={cn(
        "@container/card relative overflow-hidden transition-all duration-200",
        tone === "default" && "border-l-4 border-l-primary/60",
        tone === "pending" && "border-l-4 border-l-amber-500/60",
        tone === "warn" && "border-l-4 border-l-destructive/60",
        tone === "success" && "border-l-4 border-l-emerald-500/60",
      )}>
      <CardContent className="p-4 md:p-5">
        <div className="flex flex-col min-w-0">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-1.5 truncate text-xl font-semibold tracking-tight md:text-2xl">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Item #12: Gráfico de vendas dos últimos 7 dias em SVG puro
function SalesWeekChart({
  data,
}: {
  data: {
    days: {
      dateStr: string;
      label: string;
      shortDate: string;
      total: number;
      count: number;
      isToday: boolean;
    }[];
    maxTotal: number;
    sumTotal: number;
  };
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const avg = data.sumTotal / 7;

  return (
    <Card className="mt-6 border-border/70">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BoxIcon
                name="trending-up"
                className="text-base text-foreground"
              />
              <h2 className="text-base font-semibold">
                Vendas nos últimos 7 dias
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Volume diário de vendas finalizadas e pagas
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-xs">
            <div className="bg-muted/50 rounded-lg px-3 py-1.5 border border-border/60">
              <span className="text-muted-foreground">Total 7 dias: </span>
              <span className="font-semibold text-foreground">
                {currency(data.sumTotal)}
              </span>
            </div>
            <div className="hidden sm:block bg-muted/50 rounded-lg px-3 py-1.5 border border-border/60">
              <span className="text-muted-foreground">Média: </span>
              <span className="font-semibold text-foreground">
                {currency(avg)}/dia
              </span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-125">
            <svg
              viewBox="0 0 700 200"
              className="w-full h-44 overflow-visible"
              aria-label="Gráfico de vendas dos últimos 7 dias">
              <defs>
                <linearGradient
                  id="barGradientPrimary"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.95"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.55"
                  />
                </linearGradient>
                <linearGradient
                  id="barGradientRegular"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.65"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.25"
                  />
                </linearGradient>
                <linearGradient
                  id="barGradientHover"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="1"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0.75"
                  />
                </linearGradient>
              </defs>

              {/* Linhas de grade horizontais sutis */}
              <line
                x1="20"
                y1="30"
                x2="680"
                y2="30"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <line
                x1="20"
                y1="85"
                x2="680"
                y2="85"
                stroke="currentColor"
                strokeOpacity="0.08"
                strokeDasharray="3 3"
              />
              <line
                x1="20"
                y1="140"
                x2="680"
                y2="140"
                stroke="currentColor"
                strokeOpacity="0.12"
              />

              {/* Barras e rótulos para cada dia */}
              {data.days.map((d, i) => {
                const barWidth = 56;
                const slotWidth = 660 / 7;
                const x = 20 + i * slotWidth + (slotWidth - barWidth) / 2;
                const maxHeight = 105;
                const barHeight =
                  d.total > 0
                    ? Math.max(6, (d.total / data.maxTotal) * maxHeight)
                    : 3;
                const y = 140 - barHeight;
                const isHovered = hoveredIdx === i;

                return (
                  <g
                    key={d.dateStr}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer">
                    {/* Área de toque/hover maior */}
                    <rect
                      x={x - 8}
                      y="15"
                      width={barWidth + 16}
                      height="150"
                      fill="transparent"
                    />

                    {/* Barra de dados */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      ry="6"
                      fill={
                        isHovered
                          ? "url(#barGradientHover)"
                          : d.isToday
                            ? "url(#barGradientPrimary)"
                            : "url(#barGradientRegular)"
                      }
                      className="transition-all duration-300"
                    />

                    {/* Valor acima da barra */}
                    {d.total > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 8}
                        textAnchor="middle"
                        className={cn(
                          "text-[11px] font-semibold transition-all duration-200",
                          isHovered || d.isToday
                            ? "fill-foreground font-bold"
                            : "fill-muted-foreground",
                        )}>
                        {currency(d.total)}
                      </text>
                    )}

                    {/* Rótulo do dia */}
                    <text
                      x={x + barWidth / 2}
                      y="160"
                      textAnchor="middle"
                      className={cn(
                        "text-[12px] transition-colors",
                        d.isToday
                          ? "fill-primary font-bold"
                          : "fill-foreground font-medium",
                      )}>
                      {d.isToday ? "Hoje" : d.label}
                    </text>

                    {/* Data resumida */}
                    <text
                      x={x + barWidth / 2}
                      y="178"
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground font-normal">
                      {d.shortDate}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { can, user } = usePermissions();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const dashboardSettings = useSettingsStore((s) => s.dashboard) ?? {
    defaultPeriod: "today",
    hideLowStockCard: false,
    hideRecentSales: false,
  };
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    globalLowStockThreshold: 5,
    hideCostPrice: false,
  };

  const [period, setPeriod] = useState<DashboardPeriod>(
    dashboardSettings.defaultPeriod || "today",
  );

  useEffect(() => {
    if (dashboardSettings.defaultPeriod) {
      setPeriod(dashboardSettings.defaultPeriod);
    }
  }, [dashboardSettings.defaultPeriod]);

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingList, setIsExportingList] = useState(false);

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [fetchedSales, fetchedProducts] = await Promise.all([
        salesService.list(),
        productsService.list() as Promise<ProductFrontend[]>,
      ]);
      setSales(fetchedSales);
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!can("dashboard", "Visualizar")) {
      const targetRoute = getFirstAccessibleRoute(can);
      if (targetRoute && targetRoute !== "/dashboard") {
        router.replace(targetRoute);
      } else {
        setIsLoading(false);
      }
      return;
    }
    refreshData(false);
  }, [can, router]);

  // Sincronização em tempo real do dashboard
  useDataSync({
    types: ["sales", "products"],
    onSync: () => {
      refreshData(true);
    },
    enabled: can("dashboard", "Visualizar"),
  });

  // Itens #5, #8 e #13: Cálculo dinâmico conforme período e threshold global
  const stats = useMemo(() => {
    const now = new Date();
    const periodStart = new Date();

    if (period === "today") {
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      periodStart.setDate(now.getDate() - 7);
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === "month") {
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
    }

    const filteredSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= periodStart && d <= now;
    });

    const soldInPeriod = filteredSales
      .filter((s) => s.status === "PAGO")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const countInPeriod = filteredSales.filter(
      (s) => s.status === "PAGO",
    ).length;

    const pending = sales
      .filter((s) => s.status === "PENDENTE")
      .reduce((sum, s) => sum + Number(s.total), 0);

    const pendingCount = sales.filter((s) => s.status === "PENDENTE").length;

    const threshold = productsSettings.globalLowStockThreshold ?? 5;
    const catThresholds = productsSettings.categoryLowStockThresholds;
    const low = products.filter((p) => {
      const minStockNum =
        p.minStock !== null && p.minStock !== undefined
          ? Number(p.minStock)
          : 0;
      let min = minStockNum > 0 ? minStockNum : threshold;

      if (minStockNum <= 0 && p.category?.lowStockThreshold != null) {
        min = p.category.lowStockThreshold;
      } else if (
        minStockNum <= 0 &&
        p.categoryId &&
        catThresholds?.[p.categoryId]
      ) {
        min = catThresholds[p.categoryId];
      }

      const stockNum = Number(p.stock ?? 0);
      return min > 0 && stockNum <= min;
    });

    return { soldInPeriod, countInPeriod, pending, pendingCount, low };
  }, [
    sales,
    products,
    period,
    productsSettings.globalLowStockThreshold,
    productsSettings.categoryLowStockThresholds,
  ]);

  // Item #12: Dados dos últimos 7 dias para o gráfico
  const last7DaysData = useMemo(() => {
    const days: {
      dateStr: string;
      label: string;
      shortDate: string;
      total: number;
      count: number;
      isToday: boolean;
    }[] = [];

    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayOfWeek = d.toLocaleDateString("pt-BR", { weekday: "short" });
      const label = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1, 3);
      const shortDate = `${day}/${month}`;

      const daySales = sales.filter((s) => {
        if (s.status !== "PAGO") return false;
        const sDate = new Date(s.date);
        return (
          sDate.getFullYear() === year &&
          sDate.getMonth() === d.getMonth() &&
          sDate.getDate() === d.getDate()
        );
      });

      const total = daySales.reduce((acc, s) => acc + Number(s.total), 0);
      days.push({
        dateStr,
        label,
        shortDate,
        total,
        count: daySales.length,
        isToday: i === 0,
      });
    }

    const maxTotal = Math.max(...days.map((d) => d.total), 1);
    const sumTotal = days.reduce((acc, d) => acc + d.total, 0);

    return { days, maxTotal, sumTotal };
  }, [sales]);

  // Ordenar as vendas pela data mais recente
  const sortedSales = useMemo(() => {
    return [...sales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sales]);

  // Limite fixo de vendas recentes (padrão até 5)
  const latest = sortedSales.slice(0, 5);

  if (
    isLoading ||
    (!can("dashboard", "Visualizar") &&
      getFirstAccessibleRoute(can) !== "/dashboard")
  ) {
    return <GlobalLoader />;
  }

  if (!can("dashboard", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <BoxIcon
          name="error"
          className="text-5xl text-muted-foreground opacity-50"
        />
        <p className="text-sm font-medium">
          Você não tem permissão para visualizar o dashboard.
        </p>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Usuário";

  return (
    <div className="w-full px-4">
      {/* Header com Saudação e Botão de Configurações do Dashboard */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Aqui está o resumo da sua loja.
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={() => setIsConfigOpen(true)}
            className="h-10 px-3 sm:px-4 rounded-full shadow-xs gap-2 font-medium shrink-0 cursor-pointer"
            aria-label="Configurações do Dashboard">
            <BoxIcon name="cog" className="text-lg text-foreground" />
            <span className="hidden sm:inline text-sm">Configurações</span>
          </Button>
        </div>
      </div>

      {/* Item #13: Filtro de período nos cards */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center rounded-lg bg-muted p-1 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setPeriod("today")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
              period === "today"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}>
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
              period === "week"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}>
            Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={cn(
              "px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer",
              period === "month"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}>
            Mês
          </button>
        </div>
      </div>

      {/* Item #5 & Item #7: StatCards dinâmicos com opção de ocultar Estoque Baixo */}
      <div
        className={cn(
          "flex overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory gap-3 sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:overflow-visible",
          dashboardSettings.hideLowStockCard
            ? "sm:grid-cols-2"
            : "sm:grid-cols-2 lg:grid-cols-3",
          "[&>div]:min-w-[85vw] [&>div]:snap-center sm:[&>div]:min-w-0",
        )}>
        <StatCard
          label={
            period === "today"
              ? "Vendido hoje"
              : period === "week"
                ? "Vendido na semana"
                : "Vendido no mês"
          }
          value={currency(stats.soldInPeriod)}
          hint={`${stats.countInPeriod} venda${stats.countInPeriod === 1 ? "" : "s"} no período`}
          tone="default"
        />
        <StatCard
          label="A receber"
          value={currency(stats.pending)}
          hint={`${stats.pendingCount} venda${stats.pendingCount === 1 ? "" : "s"} pendente${stats.pendingCount === 1 ? "" : "s"}`}
          tone="pending"
        />
        {!dashboardSettings.hideLowStockCard && (
          <StatCard
            label="Estoque baixo"
            value={`${stats.low.length} produto${stats.low.length === 1 ? "" : "s"}`}
            hint={stats.low.length ? "Reponha em breve" : "Tudo em ordem"}
            tone={stats.low.length ? "warn" : "success"}
          />
        )}
      </div>

      {/* Item #12: Gráfico de vendas dos últimos 7 dias */}
      <SalesWeekChart data={last7DaysData} />

      {/* Item #7: Ocultar seção de Estoque Baixo se configurado ou se controle de estoque estiver desativado */}
      {!dashboardSettings.hideLowStockCard &&
        (productsSettings?.trackStock ?? true) &&
        products.length > 0 &&
        stats.low.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Produtos com estoque baixo
              </h2>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium gap-1.5 shrink-0"
                onClick={async () => {
                  setIsExportingList(true);
                  await handleExportLowStockPdf(
                    stats.low,
                    productsSettings.globalLowStockThreshold ?? 5,
                  );
                  setIsExportingList(false);
                }}
                disabled={isExportingList}>
                <BoxIcon
                  name={isExportingList ? "loader-alt" : "download"}
                  className={cn("text-sm", isExportingList && "animate-spin")}
                />
                <span className="hidden sm:inline">Gerar Lista (PDF)</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {stats.low.slice(0, 4).map((p) => (
                <Card key={p.id} className="border-border bg-card">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-foreground">
                      <BoxIcon
                        name="package"
                        className="text-xl text-foreground"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {p.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(p.stock)} em estoque · mínimo{" "}
                        {p.minStock !== null && p.minStock !== undefined
                          ? Number(p.minStock)
                          : (productsSettings.globalLowStockThreshold ?? 5)}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700">
                      Repor
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

      {!dashboardSettings.hideRecentSales && latest.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Últimas vendas
            </h2>
            <Link
              href="/historico"
              className="text-xs font-medium text-primary hover:underline">
              Ver tudo
            </Link>
          </div>
          <Card className="border-border/70">
            <CardContent className="divide-y divide-border p-0">
              {latest.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {s.clientName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dateTime(s.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold tabular-nums">
                      R${currency(s.total)}
                    </div>
                    <Badge
                      variant={s.status === "PAGO" ? "secondary" : "outline"}
                      className={
                        s.status === "PENDENTE"
                          ? "border-amber-500/40 text-amber-700"
                          : ""
                      }>
                      {s.status === "PAGO" ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <DashboardConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
