"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, ScanBarcode, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { currency } from "@/lib/format";
import { ProductThumb } from "@/components/product-thumb";
import { BarcodeScanner } from "@/components/barcode-scanner";

import { useSettingsStore } from "@/store/useSettingsStore";

export function ProductPicker({
  open,
  onClose,
  products,
  cartItems,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  products: import("@/types").Product[];
  cartItems: { productId: string; quantity: number }[];
  onPick: (p: import("@/types").Product) => void;
}) {
  const [q, setQ] = useState("");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const trackStock = useSettingsStore((s) => s.products?.trackStock ?? true);
  const blockOutOfStock = useSettingsStore(
    (s) => s.sales?.blockOutOfStock ?? false,
  );

  const handlePick = (p: import("@/types").Product) => {
    setJustAddedId(p.id);
    onPick(p);
    setTimeout(() => {
      setJustAddedId((current) => (current === p.id ? null : current));
    }, 800);
  };

  const availableProducts = useMemo(() => {
    if (trackStock && blockOutOfStock) {
      return products.filter((p) => p.stock > 0);
    }
    return products;
  }, [products, trackStock, blockOutOfStock]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t
      ? availableProducts.filter(
          (p) =>
            p.name.toLowerCase().includes(t) ||
            p.category?.toLowerCase().includes(t) ||
            p.barcode?.toLowerCase() === t,
        )
      : availableProducts;
  }, [q, availableProducts]);

  const handleScan = (barcode: string) => {
    const product = availableProducts.find((p) => p.barcode === barcode);
    if (product) {
      handlePick(product);
    } else {
      toast.error("Produto não encontrado com este código de barras.");
    }
  };

  const PickerContent = (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 overflow-hidden">
      <div className="flex gap-2 shrink-0 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar produtos..."
            className="rounded-xl pl-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl sm:hidden"
          onClick={() => setIsScannerOpen(true)}
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        {/* SOLUÇÃO: Esconde a barra alvejando o elemento interno do Radix */}
        <ScrollArea className="h-full">
          <div className="space-y-1 pb-4">
            {filtered.map((p) => {
              const cartQty =
                cartItems.find((i) => i.productId === p.id)?.quantity || 0;
              const remaining = p.stock - cartQty;
              const isAdded = justAddedId === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all duration-200 disabled:opacity-50 ${
                    isAdded
                      ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/20 scale-[0.99]"
                      : "border-border/60 hover:border-primary/40 hover:bg-accent"
                  }`}
                >
                  <ProductThumb name={p.name} image={p.image} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      {cartQty > 0 && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0"
                        >
                          {cartQty} no carrinho
                        </Badge>
                      )}
                    </div>
                    {trackStock && (
                      <div className="text-xs text-muted-foreground">
                        {remaining} em estoque
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isAdded && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in-75">
                        <Check className="h-3.5 w-3.5" /> +1
                      </span>
                    )}
                    <div className="text-sm font-semibold tabular-nums">
                      {currency(p.salePrice as number)}
                    </div>
                  </div>
                  {trackStock && remaining <= 0 && (
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-600/30"
                    >
                      Sem estoque
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="flex-row items-center gap-2 mb-1">
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DrawerTitle>Produtos</DrawerTitle>
              </div>
            </DrawerHeader>
            {PickerContent}
          </DrawerContent>
        </Drawer>
        <BarcodeScanner
          open={isScannerOpen}
          onOpenChange={setIsScannerOpen}
          onScan={handleScan}
          continuous
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-125 p-0 gap-0 overflow-hidden grid-rows-[auto_1fr] max-h-[85vh] [&>button]:hidden">
          <DialogHeader className="flex-row items-center gap-2 p-4 pb-0">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="ml-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle>Produtos</DialogTitle>
            </div>
          </DialogHeader>
          {PickerContent}
        </DialogContent>
      </Dialog>
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={setIsScannerOpen}
        onScan={handleScan}
        continuous
      />
    </>
  );
}
