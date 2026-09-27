"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/auth/permissions-provider";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { currency, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ProductThumb } from "@/components/product-thumb";
import { ClientPicker } from "@/components/nova-venda/client-picker";
import { ProductPicker } from "@/components/nova-venda/product-picker";

import { clientsService } from "@/services/clients.service";
import { productsService } from "@/services/products.service";
import { salesService } from "@/services/sales.service";
import {
  Client,
  PAYMENT_LABELS,
  PaymentMethod,
  Product,
  SaleStatus,
} from "@/types";
import { maskPhone } from "@/lib/masks";

type CartItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export default function NovaVenda() {
  const router = useRouter();
  const { can } = usePermissions();
  const isMobile = useIsMobile();

  // Dados do BD (substitui o useDataStore)
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado do Carrinho e Fluxo (substitui o useCartStore)
  const [client, setClient] = useState<Client | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [step, setStep] = useState<"cart" | "payment">("cart");
  const [payment, setPayment] = useState<PaymentMethod>(PaymentMethod.DINHEIRO);
  const [status, setStatus] = useState<SaleStatus>(SaleStatus.PAGO);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);

  const [clientPicker, setClientPicker] = useState(false);
  const [productPicker, setProductPicker] = useState(false);

  const checkout = step === "payment";

  // Busca os clientes e produtos ao carregar a página
  useEffect(() => {
    if (!can("nova-venda", "Visualizar")) {
      setLoadingData(false);
      return;
    }
    async function loadData() {
      try {
        setLoadingData(true);
        const [clientsData, productsData] = await Promise.all([
          clientsService.list(),
          productsService.list(),
        ]);
        setClients(clientsData as Client[]);
        
        const defaultClient = (clientsData as Client[]).find(c => c.name === "Ao consumidor");
        if (defaultClient) {
          setClient(prev => prev || defaultClient);
        }

        setProducts(productsData as Product[]);
      } catch (error) {
        toast.error("Erro ao carregar dados. Tente atualizar a página.");
        console.error(error);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [can]);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [items],
  );

  const canCheckout = client && items.length > 0;

  // Funções do carrinho
  const addProduct = (p: Product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.productId === p.id);
      const currentQty = exists ? exists.quantity : 0;

      if (currentQty + 1 > p.stock) {
        toast.warning(
          `Atenção: Estoque insuficiente para ${p.name}. (Em estoque: ${p.stock})`,
          {
            duration: 4000,
          },
        );
      }

      if (exists) {
        return prev.map((i) =>
          i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          productName: p.name,
          unitPrice: Number(p.salePrice), // Converte o Decimal do Prisma para Number
          quantity: 1,
        },
      ];
    });
  };

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return;

    const product = products.find((p) => p.id === id);
    if (product && qty > product.stock) {
      toast.warning(
        `Atenção: Estoque insuficiente para ${product.name}. (Em estoque: ${product.stock})`,
        {
          duration: 4000,
        },
      );
    }

    setItems((prev) =>
      prev.map((i) => (i.productId === id ? { ...i, quantity: qty } : i)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== id));
  };

  const clear = () => {
    setClient(null);
    setItems([]);
    setStep("cart");
    setPayment(PaymentMethod.DINHEIRO);
    setStatus(SaleStatus.PAGO);
    setDueDate("");
    setNotes("");
  };

  const handleCheckoutBack = () => {
    setStep("cart");
  };

  const finalize = async () => {
    if (!client || items.length === 0) return;

    setIsFinalizing(true);
    try {
      await salesService.create({
        clientId: client.id,
        clientName: client.name,
        items,
        total,
        paymentMethod: payment,
        status,
        dueDate: status === "PENDENTE" ? dueDate || undefined : undefined,
        notes,
      });

      toast.success("Venda registrada com sucesso!");
      clear();
      router.push("/historico");
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar venda.");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (!can("nova-venda", "Visualizar")) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive opacity-50" />
        <p className="text-sm font-medium">
          Você não tem permissão para visualizar vendas.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-[86vh] flex flex-col px-4">
      <Card
        className="mb-3 h-18.5 cursor-pointer border-border/70 transition hover:border-primary/40"
        onClick={() => setClientPicker(true)}
      >
        <CardContent className="flex items-center gap-2">
          {client ? (
            <>
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(client.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {client.name}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {maskPhone(client.phone)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setClient(null);
                }}
              >
                Trocar
              </Button>
            </>
          ) : (
            <>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Selecionar cliente</div>
                <div className="text-xs text-muted-foreground">
                  Toque para escolher
                </div>
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-4 flex gap-2">
        <Button
          disabled={loadingData}
          onClick={() => setProductPicker(true)}
          variant="outline"
          className="h-12 flex-1 justify-start rounded-xl border-dashed"
        >
          <Plus className="mr-2 h-4 w-4" />
          {loadingData ? "Carregando produtos..." : "Adicionar produto"}
        </Button>
        {items.length > 0 && (
          <Button
            onClick={clear}
            variant="outline"
            size="icon"
            className="h-12 w-12 shrink-0 rounded-xl border-dashed border-destructive/40 text-destructive hover:border-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="md:min-h-[50vh] max-h-[42vh] flex-1">
          <div className="h-full w-full flex items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum produto no carrinho.
          </div>
        </div>
      ) : (
        <div className="max-h-[50vh] flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-0.5 pb-4">
              {items.map((it) => (
                <Card key={it.productId} className="border-border/70">
                  <CardContent className="flex items-center gap-3 p-3">
                    <ProductThumb name={it.productName} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {it.productName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currency(it.unitPrice)} un
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQty(it.productId, it.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-7 text-center text-sm font-medium tabular-nums">
                        {it.quantity}
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQty(it.productId, it.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(it.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Summary bar */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 backdrop-blur-lg md:sticky md:bottom-0 md:left-64 md:mt-4 md:rounded-2xl md:border md:bg-card md:shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div>
            <div className="text-xs text-muted-foreground">
              {items.length} item{items.length === 1 ? "" : "s"}
            </div>
            <div className="text-lg font-semibold tabular-nums">
              {currency(total)}
            </div>
          </div>
          <Button
            disabled={!canCheckout}
            onClick={() => setStep("payment")}
            size="lg"
            className="rounded-full"
          >
            <ShoppingCart className="mr-2 h-4 w-4" /> Finalizar
          </Button>
        </div>
      </div>

      <ClientPicker
        open={clientPicker}
        onClose={() => setClientPicker(false)}
        onPick={(c) => {
          setClient(c);
          setClientPicker(false);
        }}
        clients={clients as any}
      />

      <ProductPicker
        open={productPicker}
        onClose={() => setProductPicker(false)}
        products={products as any}
        cartItems={items}
        onPick={(p) => {
          addProduct(p as any);
          toast.success(`${p.name} adicionado`);
        }}
      />

      {/* Checkout */}
      {isMobile ? (
        <Drawer
          open={checkout}
          onOpenChange={(o) => {
            if (!o) setStep("cart");
          }}
        >
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="flex-row items-center gap-2 shrink-0 px-4 md:px-6">
              <Button size="icon" variant="ghost" onClick={handleCheckoutBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DrawerTitle>
                Pagamento
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 md:px-6 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pb-4">
                    <div className="mb-3 shrink-0 rounded-xl border border-border bg-card p-3 text-sm">
                      <div className="font-medium">{client?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
                        {currency(total)}
                      </div>
                    </div>

                    <div className="space-y-1 mb-4">
                      {items.map((it) => (
                        <div
                          key={it.productId}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="min-w-0 truncate pr-2">
                            {it.quantity}× {it.productName}
                          </div>
                          <div className="font-medium tabular-nums">
                            {currency(it.unitPrice * it.quantity)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3 flex flex-col gap-2">
                      <Label>Forma de pagamento</Label>
                      <Select
                        value={payment}
                        onValueChange={(v) => setPayment(v as PaymentMethod)}
                      >
                        <SelectTrigger className="w-2/5 border-primary/50 focus:ring-primary/50 bg-primary/3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-3">
                      <Label>Status</Label>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {Object.values(SaleStatus).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(s)}
                            className={cn(
                              "rounded-xl border px-3 py-2 text-sm font-medium transition",
                              status === s
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {s === SaleStatus.PAGO ? "Pago" : "Pendente"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {status === SaleStatus.PENDENTE && (
                      <div className="mb-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                        <div className="text-sm text-amber-700">
                          Valor pendente:{" "}
                          <span className="font-semibold">{currency(total)}</span>
                        </div>
                        <div className="mt-2 flex flex-col gap-1.5">
                          <Label>Data prevista</Label>
                          <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex flex-col gap-2">
                      <Label>Observações</Label>
                      <Textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </ScrollArea>
              </div>

              <div className="shrink-0 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("cart")}
                    size="lg"
                    className="rounded-full"
                    disabled={isFinalizing}
                  >
                    Voltar
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 rounded-full"
                    onClick={finalize}
                    disabled={isFinalizing || !can("nova-venda", "Adicionar")}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {isFinalizing
                      ? "Salvando..."
                      : `Confirmar · ${currency(total)}`}
                  </Button>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={checkout}
          onOpenChange={(o) => {
            if (!o) setStep("cart");
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md p-0 flex flex-col gap-0">
            <DialogHeader className="flex-row items-center gap-2 shrink-0 px-6 pt-6 pb-2">
              <Button size="icon" variant="ghost" onClick={handleCheckoutBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="mt-0 pt-0">
                Pagamento
              </DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 overflow-hidden">
              <div className="mb-3 shrink-0 rounded-xl border border-border bg-card p-3 text-sm">
                <div className="font-medium">{client?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
                  {currency(total)}
                </div>
              </div>

              <div className="min-h-0 flex-1 mb-3">
                <ScrollArea className="max-h-[25vh]">
                  <div className="space-y-1 pr-2">
                    {items.map((it) => (
                      <div
                        key={it.productId}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="min-w-0 truncate pr-2">
                          {it.quantity}× {it.productName}
                        </div>
                        <div className="font-medium tabular-nums">
                          {currency(it.unitPrice * it.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="mb-3 flex flex-col gap-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={payment}
                  onValueChange={(v) => setPayment(v as PaymentMethod)}
                >
                  <SelectTrigger className="w-2/5 border-primary/50 focus:ring-primary/50 bg-primary/3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-3">
                <Label>Status</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {Object.values(SaleStatus).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition",
                        status === s
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {s === SaleStatus.PAGO ? "Pago" : "Pendente"}
                    </button>
                  ))}
                </div>
              </div>

              {status === SaleStatus.PENDENTE && (
                <div className="mb-3 space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="text-sm text-amber-700">
                    Valor pendente:{" "}
                    <span className="font-semibold">{currency(total)}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <Label>Data prevista</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4 flex flex-col gap-2">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 shrink-0 mt-auto pt-2">
                <Button
                  onClick={finalize}
                  size="lg"
                  disabled={isFinalizing || !can("nova-venda", "Adicionar")}
                  className="flex-1 rounded-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isFinalizing
                    ? "Salvando..."
                    : `Confirmar · ${currency(total)}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
