"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currency, dateTime, isToday } from "@/lib/format";
import Link from "next/link";
import { GlobalLoader } from "@/components/ui/global-loader";
import { salesService } from "@/services/sales.service";
import { productsService } from "@/services/products.service";
import type { Sale } from "@/types";
import type { ProductFrontend } from "../produtos/columns";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync } from "@/hooks/use-data-sync";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "success";
}) {
  const toneMap = {
    default: "bg-primary/10 text-primary",
    warn: "bg-amber-500/15 text-amber-600",
    success: "bg-emerald-500/15 text-emerald-600",
  } as const;
  return (
    <Card className="@container/card">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">
              {label}
            </div>
            <div className="mt-1 truncate text-xl font-semibold tracking-tight md:text-2xl">
              {value}
            </div>
            {hint && (
              <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
            )}
          </div>
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneMap[tone]}`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { can, user } = usePermissions();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
      return;
    }
    refreshData(false);
  }, [can]);

  // Sincronização em tempo real do dashboard
  useDataSync({
    types: ["sales", "products"],
    onSync: () => {
      refreshData(true);
    },
    enabled: can("dashboard", "Visualizar"),
  });

  const stats = useMemo(() => {
    const soldToday = sales
      .filter((s) => isToday(s.date) && s.status === "PAGO")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const pending = sales
      .filter((s) => s.status === "PENDENTE")
      .reduce((sum, s) => sum + Number(s.total), 0);
    const low = products.filter(
      (p) => (p.minStock ?? 0) > 0 && p.stock <= (p.minStock ?? 0)
    );
    return { soldToday, pending, low };
  }, [sales, products]);

  // Ordenar as vendas pela data mais recente
  const sortedSales = useMemo(() => {
    return [...sales].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [sales]);

  const latest = sortedSales.slice(0, 5);

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!can("dashboard", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />
        <p className="text-sm font-medium">
          Você não tem permissão para visualizar o dashboard.
        </p>
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Usuário";

  return (
    <div className="px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Aqui está o resumo da sua loja hoje.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={DollarSign}
          label="Vendido hoje"
          value={currency(stats.soldToday)}
          tone="success"
        />
        <StatCard
          icon={Clock}
          label="A receber"
          value={currency(stats.pending)}
          hint="Vendas pendentes"
        />
        <StatCard
          icon={AlertTriangle}
          label="Estoque baixo"
          value={`${stats.low.length} produto${stats.low.length === 1 ? "" : "s"}`}
          tone="warn"
          hint={stats.low.length ? "Reponha em breve" : "Tudo em ordem"}
        />
      </div>

      {products.length > 0 && stats.low.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Produtos com estoque baixo
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {stats.low.slice(0, 4).map((p) => (
              <Card key={p.id} className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.stock} em estoque · mínimo {p.minStock}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-700"
                  >
                    Repor
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Últimas vendas
            </h2>
            <Link
              href="/historico"
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver tudo
            </Link>
          </div>
          <Card className="border-border/70">
            <CardContent className="divide-y divide-border p-0">
              {latest.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
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
                      {currency(s.total)}
                    </div>
                    <Badge
                      variant={s.status === "PAGO" ? "secondary" : "outline"}
                      className={
                        s.status === "PENDENTE"
                          ? "border-amber-500/40 text-amber-700"
                          : ""
                      }
                    >
                      {s.status === "PAGO" ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
