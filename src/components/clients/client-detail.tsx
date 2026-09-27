import { useIsMobile } from "@/hooks/use-mobile";
import { currency, dateTime } from "@/lib/format";
import { Client } from "@/prisma/client";
import { maskPhone } from "@/lib/masks";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { MessageCircle, Pencil } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import Link from "next/link";

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

  if (!client) return null;

  const clientSales = sales
    .filter((s) => s.clientId === client.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = clientSales.reduce((s, v) => s + Number(v.total), 0);
  const pending = clientSales
    .filter((s) => s.status === "PENDENTE")
    .reduce((s, v) => s + Number(v.total), 0);
  const last = clientSales[0]?.date;

  // Conteúdo compartilhado entre Desktop e Mobile
  const DetailContent = (
    <div className="space-y-4 pb-4">
      <div className="rounded-xl border border-border bg-card p-3 text-sm">
        <div>
          <span className="text-muted-foreground">Telefone:</span>{" "}
          {maskPhone(client.phone)}
        </div>
        <div>
          <span className="text-muted-foreground">Email:</span> {client.email}
        </div>
        {/* <div>
          <span className="text-muted-foreground">Endereço:</span>{" "}
          {client.address || "—"}
        </div> */}
        {client.notes && (
          <div className="mt-2 text-xs text-muted-foreground">
            {client.notes}
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
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
          Histórico
        </h4>
        {clientSales.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Nenhuma compra ainda.
          </div>
        ) : (
          <div className="space-y-1">
            {clientSales.slice(0, 8).map((v) => (
              <Link
                key={v.id}
                href={`/historico?saleId=${v.id}`}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground">
                  {dateTime(v.date)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {currency(Number(v.total))}
                  </span>
                  <Badge
                    variant={v.status === "PAGO" ? "secondary" : "outline"}
                    className={
                      v.status === "PENDENTE"
                        ? "border-amber-500/40 text-amber-700"
                        : ""
                    }
                  >
                    {v.status === "PAGO" ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Botões fixos no rodapé
  const FooterButtons = (
    <div className="shrink-0 pt-4 border-t border-border flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        render={
          <Link
            href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${client.name.split(' ')[0]}!`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
          </Link>
        }
      ></Button>
      <Button size="sm" variant="outline" onClick={() => onEdit(client)}>
        <Pencil className="mr-1 h-4 w-4" /> Editar
      </Button>
    </div>
  );

  // Renderização Mobile (Drawer Bottom)
  if (isMobile) {
    return (
      <Drawer open={!!client} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4">
            <DrawerTitle>{client.name}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">{DetailContent}</div>
              </ScrollArea>
            </div>
            {FooterButtons}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Renderização Desktop (Sheet Lateral Padrão)
  return (
    <Sheet open={!!client} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{client.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 px-4 pb-6">
          {DetailContent}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`https://wa.me/${client.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${client.name.split(' ')[0]}!`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                </Link>
              }
            ></Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(client)}>
              <Pencil className="mr-1 h-4 w-4" /> Editar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
