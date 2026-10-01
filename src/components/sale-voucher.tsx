import { useEffect, useMemo, useRef, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSettingsStore, StoreInfo } from "@/store/useSettingsStore";
import { currency, formatDateOnly } from "@/lib/format";
import { PAYMENT_LABELS, type Sale } from "@/types";

interface Props {
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
  clientPhone?: string;
}

function formatDocument(doc?: string | null): string {
  if (!doc) return "";
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 14) {
    return `CNPJ : ${clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}`;
  }
  if (clean.length === 11) {
    return `CPF : ${clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}`;
  }
  return clean ? `CNPJ/CPF : ${clean}` : "";
}

function formatPhone(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.replace(/^\+55/, "").replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }
  if (clean.length === 10) {
    return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
}

function formatCep(cep?: string | null): string {
  if (!cep) return "";
  const clean = cep.replace(/\D/g, "");
  if (clean.length === 8) {
    return clean.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  }
  return cep;
}

function getAddressLines(store: StoreInfo): string[] {
  const addr = store.addressData;
  if (addr && (addr.street || addr.city)) {
    const lines: string[] = [];
    const line1Parts: string[] = [];
    if (addr.street) line1Parts.push(addr.street);
    if (addr.number) line1Parts.push(addr.number);
    let line1 = line1Parts.join(", ");
    if (addr.complement) line1 += ` - ${addr.complement}`;
    if (line1) lines.push(line1);

    const line2Parts: string[] = [];
    if (addr.neighborhood) line2Parts.push(addr.neighborhood);
    if (addr.zipCode) line2Parts.push(formatCep(addr.zipCode));
    const cityState = [addr.city, addr.state].filter(Boolean).join("/");
    if (cityState) line2Parts.push(cityState);
    if (line2Parts.length > 0) lines.push(line2Parts.join(" - "));

    return lines;
  }

  if (store.address && store.address.trim()) {
    return [store.address.trim()];
  }

  return [];
}

export function SaleVoucher({ sale, open, onClose, clientPhone }: Props) {
  const isMobile = useIsMobile();
  const store = useSettingsStore((s) => s.store);
  const setStore = useSettingsStore((s) => s.setStore);
  const voucher = useSettingsStore((s) => s.voucher);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      import("@/services/loja.service")
        .then(({ getLoja }) => getLoja())
        .then((res: any) => {
          if (res && res.name) {
            setStore({
              name: res.name,
              ownerName: res.ownerName || "",
              phone: res.phone || "",
              email: res.email || "",
              address:
                typeof res.address === "string"
                  ? res.address
                  : res.address?.street
                    ? `${res.address.street}${res.address.number ? `, ${res.address.number}` : ""}`
                    : "",
              addressData:
                res.address && typeof res.address === "object"
                  ? res.address
                  : null,
              document: res.document || "",
            });
          }
        })
        .catch(() => {});
    }
  }, [open, setStore]);

  // Código numérico de identificação do pedido/venda
  const code = useMemo(() => {
    if (!sale) return "";
    if (typeof sale.saleNumber === "number" && !isNaN(sale.saleNumber)) {
      return String(sale.saleNumber);
    }
    const numericOnly = sale.id.replace(/\D/g, "");
    if (numericOnly) {
      return String(parseInt(numericOnly.slice(-6), 10) || 1);
    }
    return "1";
  }, [sale]);

  const addressLines = useMemo(() => getAddressLines(store), [store]);
  const formattedPhone = useMemo(() => formatPhone(store.phone), [store.phone]);
  const formattedDoc = useMemo(
    () => formatDocument(store.document),
    [store.document],
  );

  const saleDateObj = useMemo(
    () => (sale ? new Date(sale.date) : new Date()),
    [sale],
  );

  const formattedDateTime = useMemo(() => {
    const d = saleDateObj.toLocaleDateString("pt-BR");
    const t = saleDateObj.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${d} ${t}`;
  }, [saleDateObj]);

  const saleDateOnly = useMemo(
    () => saleDateObj.toLocaleDateString("pt-BR"),
    [saleDateObj],
  );

  const sellerName = useMemo(() => {
    return (
      sale?.seller?.name ||
      store.ownerName ||
      "VENDEDOR"
    ).toUpperCase();
  }, [sale?.seller?.name, store.ownerName]);

  const itemsSubtotal = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  }, [sale]);

  const voucherDiscount = useMemo(() => {
    if (!sale) return 0;
    if (typeof sale.discount === "number" && sale.discount > 0) {
      return sale.discount;
    }
    const diff = itemsSubtotal - Number(sale.total);
    return diff > 0.01 ? diff : 0;
  }, [sale, itemsSubtotal]);

  const render = async () => {
    if (!ref.current) throw new Error("sem conteúdo");
    const el = ref.current;

    const prevHeight = el.style.height;
    const prevOverflow = el.style.overflow;
    el.style.height = "auto";
    el.style.overflow = "visible";

    const viewport = el.closest(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    if (viewport) {
      viewport.style.height = "auto";
      viewport.style.overflow = "visible";
    }

    try {
      return await toPng(el, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
    } finally {
      el.style.height = prevHeight;
      el.style.overflow = prevOverflow;
      if (viewport) {
        viewport.style.height = "";
        viewport.style.overflow = "";
      }
    }
  };

  const downloadPng = async () => {
    try {
      setBusy("png");
      const url = await render();
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprovante-${code}.png`;
      a.click();
      toast.success("Imagem baixada");
    } catch {
      toast.error("Não foi possível gerar a imagem");
    } finally {
      setBusy(null);
    }
  };

  const downloadPdf = async () => {
    try {
      setBusy("pdf");
      const url = await render();
      const img = new window.Image();
      img.src = url;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const { jsPDF } = await import("jspdf");
      const w = 80;
      const h = (img.height / img.width) * w;
      const pdf = new jsPDF({ unit: "mm", format: [w, h] });
      pdf.addImage(url, "PNG", 0, 0, w, h);
      pdf.save(`comprovante-${code}.pdf`);
      toast.success("PDF gerado");
    } catch {
      toast.error("Não foi possível gerar o PDF");
    } finally {
      setBusy(null);
    }
  };

  const shareWhatsapp = async () => {
    if (!sale) return;
    try {
      setBusy("share");
      const url = await render();
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], `comprovante-${code}.png`, {
        type: "image/png",
      });
      const text = `Comprovante ${code} — ${store.name}\n${sale.clientName}\nTotal: ${currency(sale.total)}`;

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `comprovante-${code}.png`;
        a.click();
        const phone = (clientPhone || "").replace(/\D/g, "");
        window.open(
          `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
          "_blank",
        );
        toast.success("Imagem baixada — anexe na conversa do WhatsApp");
      }
    } catch {
      toast.error("Não foi possível compartilhar");
    } finally {
      setBusy(null);
    }
  };

  // Design do comprovante térmico fiel ao modelo solicitado
  const VoucherDesign = sale ? (
    <div
      ref={ref}
      className="mx-auto w-full max-w-sm bg-white text-slate-950 overflow-hidden font-mono text-[12px] leading-tight select-none"
      style={{ padding: "24px 20px", boxShadow: "0 0 10px rgba(0,0,0,0.06)" }}
    >
      {/* 1. Nome da empresa no topo em negrito */}
      <div className="text-center space-y-1">
        <h2 className="font-extrabold text-base sm:text-lg uppercase tracking-tight text-slate-950">
          {store.name || "NOME DA EMPRESA"}
        </h2>

        {/* 2. Endereço da loja (se cadastrado) */}
        {addressLines.map((line, idx) => (
          <div key={idx} className="text-xs uppercase text-slate-800">
            {line}
          </div>
        ))}

        {/* 3. Telefone (se cadastrado) */}
        {formattedPhone && (
          <div className="text-xs text-slate-800 font-medium">
            {formattedPhone}
          </div>
        )}

        {/* 4. CNPJ (se cadastrado, sem IE) */}
        {formattedDoc && (
          <div className="text-xs uppercase text-slate-800 font-medium">
            {formattedDoc}
          </div>
        )}
      </div>

      {/* 5. Cliente */}
      <div className="mt-4 text-xs uppercase font-semibold text-slate-950">
        CLIENTE : {sale.clientName?.toUpperCase() || "CONSUMIDOR FINAL"}
      </div>

      {/* 6. Data, Horário e Comprovante de Venda */}
      <div className="flex justify-between items-end mt-3 mb-1.5 text-xs text-slate-950">
        <div className="font-medium tracking-tight">{formattedDateTime}</div>
        <div className="text-right">
          <div className="text-[10px] tracking-wider uppercase font-semibold text-slate-600 leading-none">
            COMPROVANTE DE VENDA
          </div>
          <div className="text-sm sm:text-base font-extrabold tracking-wider leading-tight text-slate-950">
            Nº {code}
          </div>
        </div>
      </div>

      {/* Linha separadora */}
      <div className="border-t-2 border-slate-900 my-1.5" />

      {/* 7. Cabeçalho da Tabela de Itens */}
      <div className="text-xs text-slate-900 font-bold uppercase tracking-tight">
        <div className="flex justify-between">
          <span className="w-16 shrink-0">CODIGO</span>
          <span className="flex-1 text-left">DESCRIÇÃO</span>
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="w-16 shrink-0" />
          <span className="flex-1 text-left">QTD x UNIT</span>
          <span className="shrink-0 text-right">R$ VALOR</span>
        </div>
      </div>

      <div className="border-t border-slate-900 my-1.5" />

      {/* 8. Lista de Itens */}
      <div className="space-y-2 text-xs text-slate-950">
        {sale.items.map((it, idx) => {
          const itemCode =
            it.product?.code ||
            (it.productId
              ? it.productId.replace(/\D/g, "").slice(-5).padStart(5, "0")
              : String(idx + 1).padStart(5, "0"));
          const itemTotal = it.unitPrice * it.quantity;

          return (
            <div key={it.productId || idx} className="space-y-0.5">
              <div className="flex items-start gap-2">
                <span className="w-16 shrink-0 font-medium">{itemCode}</span>
                <span className="flex-1 uppercase font-semibold wrap-break-word">
                  {it.productName}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-800">
                <span className="w-16 shrink-0" />
                <span className="flex-1 text-left">
                  {it.quantity} x{" "}
                  {currency(it.unitPrice).replace("R$", "").trim()}
                </span>
                <span className="shrink-0 font-bold text-slate-950">
                  {currency(itemTotal).replace("R$", "").trim()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t-2 border-slate-900 my-2" />

      {/* 9. Totais */}
      <div className="space-y-1 text-xs text-slate-950">
        {voucherDiscount > 0 && (
          <>
            <div className="flex justify-between items-center text-xs text-slate-700">
              <span>Subtotal R$</span>
              <span>{currency(itemsSubtotal).replace("R$", "").trim()}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-800 font-semibold">
              <span>Desconto R$</span>
              <span>- {currency(voucherDiscount).replace("R$", "").trim()}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center text-sm font-extrabold text-slate-950">
          <span>Total da Nota R$</span>
          <span>{currency(sale.total).replace("R$", "").trim()}</span>
        </div>
        {sale.status === "PENDENTE" && (
          <div className="flex justify-between items-center text-xs text-amber-700 font-semibold pt-1">
            <span>SITUAÇÃO:</span>
            <span>PENDENTE</span>
          </div>
        )}
        {sale.dueDate && (
          <div className="flex justify-between items-center text-xs text-slate-700">
            <span>VENCIMENTO:</span>
            <span>{formatDateOnly(sale.dueDate)}</span>
          </div>
        )}
      </div>

      {/* 10. Forma de Pagamento */}
      <div className="mt-3 pt-2 text-xs text-slate-950">
        <div className="font-extrabold uppercase mb-1">
          FORMA DE PGTO. :{" "}
          {PAYMENT_LABELS[sale.paymentMethod]?.toUpperCase() || "À VISTA"}
        </div>
        <div className="flex justify-between font-bold text-[11px] uppercase tracking-tight text-slate-700">
          <span className="w-1/3 text-left">DATA PGTO</span>
          <span className="w-1/3 text-center">R$ VALOR</span>
          <span className="w-1/3 text-right">TIPO PGTO</span>
        </div>
        <div className="flex justify-between text-xs text-slate-950 mt-1">
          <span className="w-1/3 text-left">{saleDateOnly}</span>
          <span className="w-1/3 text-center font-bold">
            {currency(sale.total).replace("R$", "").trim()}
          </span>
          <span className="w-1/3 text-right uppercase">
            {PAYMENT_LABELS[sale.paymentMethod]?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* 11. Vendedor */}
      <div className="border-y-2 border-slate-900 py-1.5 my-3 uppercase font-bold text-xs text-slate-950">
        VENDEDOR(A) : {sellerName}
      </div>

      {/* 12. Observações (se houver) */}
      {sale.notes && (
        <div className="my-2 p-1.5 border border-dashed border-slate-400 text-[11px] uppercase text-slate-800">
          OBS: {sale.notes}
        </div>
      )}

      {/* 13. Rodapé */}
      <div className="mt-4 pt-3 border-t border-slate-900 text-center">
        <div className="font-bold text-xs tracking-wider uppercase text-slate-950">
          {voucher.footerText || "* OBRIGADO E VOLTE SEMPRE *"}
        </div>
        <div className="text-[10px] text-slate-500 uppercase mt-1">
          * DOCUMENTO SEM VALOR FISCAL *
        </div>
      </div>
    </div>
  ) : null;

  // Botões de ação
  const ActionButtons = (
    <div className="space-y-2">
      <Button
        className="h-12 w-full rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
        onClick={shareWhatsapp}
        disabled={!!busy}
      >
        <BoxIcon name="share-alt" className="mr-2 text-base text-current" />
        Compartilhar via WhatsApp
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="h-11 rounded-full text-foreground"
          onClick={downloadPdf}
          disabled={!!busy}
        >
          <BoxIcon name="file" className="mr-2 text-base text-foreground" /> PDF
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-full text-foreground"
          onClick={downloadPng}
          disabled={!!busy}
        >
          <BoxIcon name="download" className="mr-2 text-base text-foreground" /> Imagem
        </Button>
      </div>
    </div>
  );

  // Renderização Mobile (Drawer)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4">
            <DrawerTitle className="sr-only">Comprovante da venda</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div
                  tabIndex={0}
                  className="outline-none h-px w-full opacity-0"
                />
                <div className="pb-4">
                  {VoucherDesign}
                  <div className="mt-4">{ActionButtons}</div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Renderização Desktop (Modal)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] sm:max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Comprovante da venda</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[90vh] w-full **:data-[slot=scroll-area-scrollbar]:hidden">
          <div tabIndex={0} className="outline-none h-px w-full opacity-0" />
          <div className="px-6 py-6">
            {VoucherDesign}
            <div className="mt-4">{ActionButtons}</div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
