import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency, dateTime } from "@/lib/format";
import { Client } from "@/prisma/client";
import { maskPhone } from "@/lib/masks";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { ChevronDown, MessageCircle, Pencil, Receipt } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import Link from "next/link";
import { PAYMENT_LABELS, type Sale } from "@/types";
import { cn } from "@/lib/utils";

function ClientSaleCard({ sale }: { sale: Sale }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/70 bg-card/60 transition hover:border-border">
      <div
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-between p-2.5 text-sm cursor-pointer select-none"
      >
        <div className="min-w-0 flex items-center gap-2">
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
              expanded && "rotate-180"
            )}
          />
          <div>
            <div className="text-xs font-medium text-foreground">
              {dateTime(sale.date)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {sale.items.length} {sale.items.length === 1 ? "item" : "itens"} ·{" "}
              {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-semibold tabular-nums text-sm">
            {currency(Number(sale.total))}
          </span>
          <Badge
            variant={sale.status === "PAGO" ? "secondary" : "outline"}
            className={
              sale.status === "PENDENTE"
                ? "border-amber-500/40 text-amber-700 bg-amber-500/10 text-[10px] px-1.5 h-4.5"
                : "text-[10px] px-1.5 h-4.5"
            }
          >
            {sale.status === "PAGO" ? "Pago" : "Pendente"}
          </Badge>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-3 py-2 text-xs bg-muted/20 space-y-2 animate-in fade-in-50 duration-150">
          <div className="space-y-1">
            {sale.items.map((it, idx) => (
              <div
                key={`${it.productId}-${idx}`}
                className="flex items-center justify-between text-muted-foreground"
              >
                <span className="truncate pr-2 text-foreground">
                  {it.quantity}x {it.productName}
                </span>
                <span className="tabular-nums shrink-0 font-medium">
                  {currency(it.quantity * it.unitPrice)}
                </span>
              </div>
            ))}
          </div>

          {typeof sale.discount === "number" && sale.discount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-border/40">
              <span>Desconto</span>
              <span className="tabular-nums">- {currency(sale.discount)}</span>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">
              Forma: {PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}
            </span>
            <Link
              href={`/historico?saleId=${sale.id}`}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              <Receipt className="h-3 w-3" /> Ver no histórico
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientDetail({
  client,
  sales,
  onClose,
  onEdit,
}: {
  client: Client | null;
  sales: import("@/types").Sale[];
  onClose: () => void;
  onEdit: (c: Client) => void;
}) {
  const isMobile = useIsMobile();
  const [cachedClient, setCachedClient] = useState<Client | null>(client);

  useEffect(() => {
    if (client) {
      setCachedClient(client);
    }
  }, [client]);

  const activeClient = client || cachedClient;
  const isOpen = Boolean(client);

  if (!activeClient) {
    if (isMobile) {
      return (
        <Drawer open={false} onOpenChange={() => {}} blur>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="shrink-0 px-4">
              <DrawerTitle className="sr-only">Detalhes do cliente</DrawerTitle>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={false} onOpenChange={() => {}} blur>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Detalhes do cliente</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const clientSales = sales
    .filter((s) => s.clientId === activeClient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = clientSales.reduce((s, v) => s + Number(v.total), 0);
  const pending = clientSales
    .filter((s) => s.status === "PENDENTE")
    .reduce((s, v) => s + Number(v.total), 0);
  const last = clientSales[0]?.date;

  // Conteúdo compartilhado entre Desktop e Mobile
  const DetailContent = (
    <div className="space-y-4 pb-2">
      <div className="rounded-xl border border-border bg-card p-3 text-sm">
        <div>
          <span className="text-muted-foreground">Telefone:</span>{" "}
          {maskPhone(activeClient.phone)}
        </div>
        <div>
          <span className="text-muted-foreground">Email:</span>{" "}
          {activeClient.email || "Não informado"}
        </div>
        {activeClient.notes && (
          <div className="mt-2 text-xs text-muted-foreground">
            {activeClient.notes}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Total" value={currency(total)} />
        <MiniStat
          label="Pendente"
          value={currency(pending)}
          tone={pending > 0 ? "warn" : "default"}
        />
        <MiniStat
          label="Última"
          value={last ? dateTime(last).split(",")[0]! : "—"}
        />
      </div>

      <Separator />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground">
            Histórico de Compras ({clientSales.length})
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Clique para ver itens
          </span>
        </div>
        {clientSales.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma compra ainda.
          </div>
        ) : (
          <div className="space-y-1.5">
            {clientSales.map((v) => (
              <ClientSaleCard key={v.id} sale={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Botões de ação compartilhados
  const ActionButtons = (
    <div className="flex w-full items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          render={
            <Link
              href={`https://wa.me/${activeClient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${activeClient.name.split(" ")[0]}!`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> WhatsApp
            </Link>
          }
        />
        <Button size="sm" variant="outline" onClick={() => onEdit(activeClient)}>
          <Pencil className="mr-1.5 h-4 w-4" /> Editar
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={onClose}>
        Fechar
      </Button>
    </div>
  );

  // Renderização Mobile (Drawer Bottom)
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()} blur>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4">
            <DrawerTitle>{activeClient.name}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">{DetailContent}</div>
              </ScrollArea>
            </div>
            <div className="shrink-0 pt-4 mt-2 border-t border-border">
              {ActionButtons}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Renderização Desktop (Dialog Centralizado)
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()} blur>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{activeClient.name}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {DetailContent}
        </div>
        <DialogFooter className="mt-2 flex-row items-center justify-between sm:justify-between">
          {ActionButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${
          tone === "warn" ? "text-amber-600" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
