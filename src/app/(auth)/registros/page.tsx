"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BoxIcon } from "@/components/ui/box-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: any;
  user: { name: string };
  createdAt: string;
}

export default function RegistrosPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/audit");
        if (res.ok) {
          const data = await res.json();
          setLogs(data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const getActionInfo = (log: AuditLog) => {
    switch (log.action) {
      case "CREATE_PRODUCT":
        return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Produto Criado", icon: "plus" };
      case "UPDATE_PRODUCT":
        return { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Produto Editado", icon: "pencil" };
      case "DELETE_PRODUCT":
        return { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Produto Excluído", icon: "trash" };
      case "UPDATE_STOCK":
        return { color: "bg-amber-500/10 text-amber-500 border-amber-500/20", label: "Estoque Alterado", icon: "package" };
      case "CREATE_SALE":
        return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", label: "Venda Realizada", icon: "cart" };
      case "UPDATE_SALE_STATUS":
        return { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Status da Venda", icon: "refresh" };
      case "DELETE_SALE":
        return { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Venda Excluída", icon: "trash" };
      default:
        return { color: "bg-muted text-muted-foreground border-border", label: log.action, icon: "info-circle" };
    }
  };

  const renderDetails = (log: AuditLog) => {
    if (!log.details) return null;
    try {
      const details = typeof log.details === "string" ? JSON.parse(log.details) : log.details;
      
      if (log.action === "UPDATE_STOCK") {
        return <span className="text-muted-foreground">Estoque mudou de <strong className="text-foreground">{details.oldStock}</strong> para <strong className="text-foreground">{details.newStock}</strong> (Aj. {details.increment})</span>;
      }
      if (log.action === "UPDATE_PRODUCT" && details.oldSalePrice !== undefined) {
        return <span className="text-muted-foreground">Preço de venda alterado para <strong className="text-foreground">R$ {details.newSalePrice.toFixed(2)}</strong></span>;
      }
      if (log.action === "CREATE_SALE" || log.action === "DELETE_SALE") {
        return <span className="text-muted-foreground">Venda #{details.saleNumber} - Valor: <strong className="text-foreground">R$ {details.total.toFixed(2)}</strong></span>;
      }
      if (log.action === "UPDATE_SALE_STATUS") {
        return <span className="text-muted-foreground">Status alterado de {details.oldStatus} para <strong className="text-foreground">{details.newStatus}</strong></span>;
      }
      
      return <span className="text-muted-foreground font-mono text-[10px]">{JSON.stringify(details).substring(0, 50)}...</span>;
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full px-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registros de Atividade</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe as últimas ações realizadas no sistema.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
          <CardDescription>
            Acompanhe as últimas ações realizadas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <BoxIcon name="loader-alt" className="animate-spin text-2xl" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum registro encontrado.
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {logs.map((log) => {
                  const info = getActionInfo(log);
                  return (
                    <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 bg-muted/20">
                      <div className={`mt-0.5 p-2 rounded-full border ${info.color}`}>
                        <BoxIcon name={info.icon} className="text-lg" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{info.label}</span>
                          <span className="text-xs text-muted-foreground">
                            por {log.user?.name || "Desconhecido"}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt))}
                          </span>
                        </div>
                        <div className="text-xs flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] rounded-sm py-0 bg-background/50">
                            {log.entity}
                          </Badge>
                          {renderDetails(log)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
