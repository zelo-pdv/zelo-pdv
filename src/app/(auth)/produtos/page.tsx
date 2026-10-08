"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlobalLoader } from "@/components/ui/global-loader";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getProductColumns, ProductFrontend } from "./columns";
import { ProductsDataTable } from "./data-table";
import { productsService } from "@/services/products.service";
import { categoriesService } from "@/services/categories.service";
import { unitsService, Unit } from "@/services/units.service";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/prisma/client";
import { BoxIcon } from "@/components/ui/box-icon";
import { usePermissions } from "@/components/auth/permissions-provider";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";
import { useSettingsStore } from "@/store/useSettingsStore";
import { MobileActionFab } from "@/components/ui/mobile-action-fab";
import { handleExportProducts } from "@/lib/export";
import { ProductsImportModal } from "@/components/produtos/products-import-modal";
import { ProductsConfigModal } from "@/components/produtos/products-config-modal";

// 1. Estado do Formulário usa NUMBER agora, compatível com frontend
export type FormState = {
  name: string;
  categoryId: string;
  description: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  notes: string;
  barcode: string;
  code: string;
  unit: string;
  image: string;
};

// 2. Variável que estava faltando
const emptyForm: FormState = {
  name: "",
  categoryId: "",
  description: "",
  costPrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 0,
  notes: "",
  barcode: "",
  code: "",
  unit: "UN",
  image: "",
};

export default function ProdutosPage() {
  const { can } = usePermissions();
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    globalLowStockThreshold: 5,
    hideCostPrice: false,
  };
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);



  const [editing, setEditing] = useState<ProductFrontend | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockDialog, setStockDialog] = useState<ProductFrontend | null>(null);
  const [deleting, setDeleting] = useState<ProductFrontend | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await handleExportProducts();
    setIsExporting(false);
  };

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [fetchedProducts, fetchedCategories, fetchedUnits] =
        await Promise.all([
          productsService.list(),
          categoriesService.list(),
          unitsService.getUnits(),
        ]);

      setProducts(fetchedProducts as ProductFrontend[]);
      setCategories(fetchedCategories as Category[]);
      setUnits(fetchedUnits as Unit[]);
    } catch (error) {
      if (!silent) {
        toast.error("Erro ao carregar dados dos produtos.");
      }
      console.error("Erro ao carregar produtos ou categorias:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    refreshData(false);
  }, []);

  // Sincronização em tempo real entre dispositivos e abas
  useDataSync({
    types: ["products", "categories"],
    onSync: () => {
      refreshData(true);
    },
  });

  // Extrai apenas os nomes para alimentar o filtro do Data-table
  const categoryNames = useMemo(
    () => categories.map((c) => c.name).sort(),
    [categories],
  );

  const handleToggleActive = async (product: ProductFrontend) => {
    try {
      const newStatus = !(product.active ?? true);
      await productsService.update(product.id, { active: newStatus });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, active: newStatus } : p,
        ),
      );
      toast.success(
        newStatus
          ? "Produto ativado com sucesso!"
          : "Produto desativado com sucesso!",
      );
      notifyLocalSync("products");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar status do produto.",
      );
    }
  };

  const columns = useMemo(
    () =>
      getProductColumns({
        onStock: setStockDialog,
        onEdit: setEditing,
        onDelete: setDeleting,
        onToggleActive: handleToggleActive,
        can,
        globalLowStockThreshold: productsSettings.globalLowStockThreshold,
        categoryLowStockThresholds: productsSettings.categoryLowStockThresholds,
        trackStock: productsSettings.trackStock ?? true,
      }),
    [can, productsSettings.globalLowStockThreshold, productsSettings.categoryLowStockThresholds, productsSettings.trackStock],
  );

  if (loading) {
    return <GlobalLoader />;
  }

  return (
    <div className="w-full px-4">
      <ProductsDataTable
        columns={columns}
        data={products}
        categories={categoryNames}
        onCreateClick={() => setCreating(true)}
        onConfigClick={() => setIsConfigOpen(true)}
        onImportClick={() => setIsImportOpen(true)}
        onExportClick={handleExport}
        isExporting={isExporting}
      />

      <MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        onConfig={() => setIsConfigOpen(true)}
        onImport={() => setIsImportOpen(true)}
        isExporting={isExporting} 
      />
      <ProductsImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      <ProductsConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />


      <ProductForm
        key={editing?.id ?? "new"}
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={
          editing
            ? {
                name: editing.name,
                categoryId: editing.categoryId || "",
                description: editing.description || "",
                costPrice: editing.costPrice,
                salePrice: editing.salePrice,
                stock: Number(editing.stock ?? 0),
                minStock: Number(editing.minStock ?? 0),
                notes: editing.notes || "",
                barcode: editing.barcode || "",
                code: editing.code || "",
                unit: editing.unit || "UN",
                image: editing.image || "",
              }
            : {
                ...emptyForm,
                categoryId:
                  categories.find((c) => c.name === "Geral" || c.name === "Diversos")?.id || categories[0]?.id || "",
              }
        }
        isEdit={!!editing}
        productId={editing?.id}
        categories={categories}
        units={units}
        products={products}
        onSubmit={async (data) => {
          try {
            if (editing) {
              const updatedProduct = (await productsService.update(
                editing.id,
                data,
              )) as ProductFrontend;

              setProducts((prev) =>
                prev.map((product) =>
                  product.id === editing.id
                    ? { ...product, ...updatedProduct }
                    : product,
                ),
              );

              toast.success("Produto atualizado com sucesso!");
              notifyLocalSync("products");
            } else {
              const newProduct = (await productsService.create(
                data,
              )) as ProductFrontend;

              setProducts((prev) => [newProduct, ...prev]);

              toast.success("Produto cadastrado com sucesso!");
              notifyLocalSync("products");
            }

            setCreating(false);
            setEditing(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Ocorreu um erro inesperado.";

            toast.error(message);
          }
        }}
      />

      <StockEntry
        product={stockDialog}
        onClose={() => setStockDialog(null)}
        onSuccess={(updatedProduct) => {
          setProducts((prev) =>
            prev.map((product) =>
              product.id === updatedProduct.id
                ? { ...product, ...updatedProduct }
                : product,
            ),
          );
          notifyLocalSync("products");
        }}
      />

      <DeleteProduct
        product={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async (id) => {
          try {
            await productsService.remove(id);

            setProducts((prev) => prev.filter((product) => product.id !== id));

            toast.success("Produto removido com sucesso!");
            setDeleting(null);
            notifyLocalSync("products");
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Erro ao remover produto.";

            toast.error(message);
          }
        }}
      />
    </div>
  );
}

function DeleteProduct({
  product,
  onClose,
  onConfirm,
}: {
  product: ProductFrontend | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <AlertDialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover produto?</AlertDialogTitle>

          <AlertDialogDescription>
            {product?.name} será removido do catálogo. O histórico de vendas deste
            produto será mantido intacto no sistema. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>

          <LoadingButton
            loading={busy}
            onClick={async () => {
              if (!product) return;

              setBusy(true);
              try {
                await onConfirm(product.id);
              } finally {
                setBusy(false);
              }
            }}
          >
            Remover
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StockEntry({
  product,
  onClose,
  onSuccess,
}: {
  product: ProductFrontend | null;
  onClose: () => void;
  onSuccess: (product: ProductFrontend) => void;
}) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const isMobile = useIsMobile();

  const handleAddStock = async () => {
    if (!product || qty <= 0) return;

    setBusy(true);
    try {
      const updatedProduct = await productsService.addStock(product.id, qty);
      onSuccess(updatedProduct as ProductFrontend);
      toast.success(`+${qty} un adicionados`);
      setQty(1);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao adicionar estoque.";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const ContentBody = product && (
    <div className="space-y-3 py-2">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{product.name}</span> —
        atual: {Number(product.stock)}
      </div>

      <div className="space-y-2">
        <Label>Quantidade a adicionar</Label>
        <Input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          inputMode="numeric"
          onFocus={(e) => e.target.select()}
        />
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-between gap-2 sm:justify-end">
      <Button variant="outline" onClick={onClose} disabled={busy}>
        Cancelar
      </Button>

      <LoadingButton
        loading={busy}
        disabled={qty <= 0}
        onClick={handleAddStock}
      >
        Adicionar
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={!!product} onOpenChange={(open) => !open && onClose()} blur>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Entrada de estoque</DrawerTitle>
          </DrawerHeader>
          {ContentBody}
          <div className="flex flex-col gap-2 pt-4 w-full">
            <LoadingButton
              loading={busy}
              disabled={qty <= 0}
              onClick={handleAddStock}
              className="h-11 w-full rounded-full font-medium"
            >
              Adicionar
            </LoadingButton>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={busy}
              className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()} blur>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrada de estoque</DialogTitle>
        </DialogHeader>

        {ContentBody}

        <DialogFooter>{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function isValidEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(barcode[i], 10) * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(barcode[12], 10);
}

function generateInternalBarcode(): string {
  const prefix = "200"; // Uso interno
  let randomPart = "";
  for (let i = 0; i < 9; i++) {
    randomPart += Math.floor(Math.random() * 10).toString();
  }
  const base = prefix + randomPart;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit.toString();
}

function ProductForm({
  open,
  onOpenChange,
  initial,
  isEdit,
  categories,
  units,
  productId,
  products,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: FormState;
  isEdit: boolean;
  categories: Category[];
  units: Unit[];
  productId?: string;
  products: ProductFrontend[];
  onSubmit: (data: FormState) => Promise<void>;
}) {
  const isMobile = useIsMobile();
  const productsSettings = useSettingsStore((s) => s.products);
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>(initial.image || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawValues, setRawValues] = useState<Record<string, string>>({
    costPrice: initial.costPrice === 0 ? "" : String(initial.costPrice),
    salePrice: initial.salePrice === 0 ? "" : String(initial.salePrice),
    stock: initial.stock === 0 ? "" : String(initial.stock),
    minStock: initial.minStock === 0 ? "" : String(initial.minStock),
  });

  const DRAFT_KEY = "@zelo-pdv/new-product-draft";

  useEffect(() => {
    if (open) {
      if (isEdit) {
        setForm(initial);
        setImagePreview(initial.image || "");
        setRawValues({
          costPrice: initial.costPrice === 0 ? "" : String(initial.costPrice),
          salePrice: initial.salePrice === 0 ? "" : String(initial.salePrice),
          stock: initial.stock === 0 ? "" : String(initial.stock),
          minStock: initial.minStock === 0 ? "" : String(initial.minStock),
        });
      } else {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          try {
            const parsed = JSON.parse(draft);
            setForm(parsed);
            setImagePreview(parsed.image || "");
            setRawValues({
              costPrice: parsed.costPrice === 0 ? "" : String(parsed.costPrice),
              salePrice: parsed.salePrice === 0 ? "" : String(parsed.salePrice),
              stock: parsed.stock === 0 ? "" : String(parsed.stock),
              minStock: parsed.minStock === 0 ? "" : String(parsed.minStock),
            });
          } catch {
            setForm(initial);
            setImagePreview(initial.image || "");
          }
        } else {
          setForm(initial);
          setImagePreview(initial.image || "");
          setRawValues({
            costPrice: initial.costPrice === 0 ? "" : String(initial.costPrice),
            salePrice: initial.salePrice === 0 ? "" : String(initial.salePrice),
            stock: initial.stock === 0 ? "" : String(initial.stock),
            minStock: initial.minStock === 0 ? "" : String(initial.minStock),
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit]);

  useEffect(() => {
    if (open && !isEdit) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }
  }, [form, open, isEdit]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerClosingRef = useRef(false);

  const handleScannerOpenChange = (nextOpen: boolean) => {
    setIsScannerOpen(nextOpen);
    if (!nextOpen) {
      scannerClosingRef.current = true;
      setTimeout(() => {
        scannerClosingRef.current = false;
      }, 400);
    }
  };

  const handleFormOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (isScannerOpen || scannerClosingRef.current)) {
      return;
    }
    onOpenChange(nextOpen);
  };

  // Capitaliza a primeira letra de cada palavra (ex: "Café Torrado")
  const toTitleCaseWords = (str: string): string => {
    return str.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const formatted = toTitleCaseWords(target.value);
    updateString("name", formatted);
    if (start !== null && end !== null) {
      requestAnimationFrame(() => {
        target.setSelectionRange(start, end);
      });
    }
  };

  // Determina casas decimais permitidas para a unidade selecionada
  const getUnitDecimals = (unitAbbr: string): number => {
    const u = units.find((item) => item.abbreviation === unitAbbr);
    if (u !== undefined && u.decimalPlaces !== undefined) {
      if (unitAbbr.toUpperCase() === "G" && u.decimalPlaces === 0) return 3;
      return u.decimalPlaces;
    }
    const upper = (unitAbbr || "").toUpperCase();
    if (["UN", "CX", "PCT", "PAR", "FD", "DZ"].includes(upper)) return 0;
    if (["G", "KG", "L", "ML"].includes(upper)) return 3;
    if (["M", "MT", "CM"].includes(upper)) return 2;
    return 0;
  };

  // Atualiza um campo de texto simples
  const updateString = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleUnitChange = (newUnit: string | null) => {
    if (!newUnit) return;
    const newDecimals = getUnitDecimals(newUnit);
    if (newDecimals === 0) {
      const newStock = Math.floor(form.stock);
      const newMinStock = Math.floor(form.minStock);
      setForm((f) => ({ ...f, unit: newUnit, stock: newStock, minStock: newMinStock }));
      setRawValues((prev) => ({
        ...prev,
        stock: newStock === 0 ? "" : String(newStock),
        minStock: newMinStock === 0 ? "" : String(newMinStock),
      }));
    } else {
      updateString("unit", newUnit);
    }
  };

  // Lógica específica para estoque atual e mínimo baseado na unidade
  const handleStockNumericChange = (k: "stock" | "minStock", raw: string) => {
    const maxDecimals = getUnitDecimals(form.unit);
    if (maxDecimals === 0) {
      const sanitized = raw.replace(/\D/g, "");
      setRawValues((prev) => ({ ...prev, [k]: sanitized }));
      const num = sanitized === "" ? 0 : parseInt(sanitized, 10);
      setForm((f) => ({ ...f, [k]: num }));
    } else {
      const sanitized = raw.replace(/[^0-9.,]/g, "");
      const parts = sanitized.replace(",", ".").split(".");
      let normalized = parts[0];
      if (parts.length > 1) {
        normalized += "." + parts.slice(1).join("").slice(0, maxDecimals);
      }
      const displayRaw = sanitized.includes(",") && parts.length > 1
        ? parts[0] + "," + parts.slice(1).join("").slice(0, maxDecimals)
        : (parts.length > 1 ? parts[0] + "." + parts.slice(1).join("").slice(0, maxDecimals) : parts[0]);

      setRawValues((prev) => ({ ...prev, [k]: displayRaw }));
      const num = parseFloat(normalized);
      if (!isNaN(num) && num >= 0) {
        setForm((f) => ({ ...f, [k]: num }));
      } else if (normalized === "" || normalized === ".") {
        setForm((f) => ({ ...f, [k]: 0 }));
      }
    }
  };

  const handleStockBlur = (k: "stock" | "minStock") => {
    const num = form[k] as number;
    const maxDecimals = getUnitDecimals(form.unit);
    if (num === 0) {
      setRawValues((prev) => ({ ...prev, [k]: "" }));
    } else if (maxDecimals === 0) {
      setRawValues((prev) => ({ ...prev, [k]: String(Math.floor(num)) }));
    } else {
      setRawValues((prev) => ({ ...prev, [k]: String(num) }));
    }
  };

  // Para campos numéricos de preço (mantém vírgula/ponto)
  const handleNumericChange = (k: keyof FormState, raw: string) => {
    // Permite apenas números, vírgula e ponto
    const sanitized = raw.replace(/[^0-9.,]/g, "");
    
    // Evita múltiplas vírgulas/pontos mantendo apenas o primeiro
    const parts = sanitized.replace(",", ".").split(".");
    const normalized = parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : "");

    const displayRaw = sanitized;

    setRawValues((prev) => ({ ...prev, [k]: displayRaw }));
    
    const num = parseFloat(normalized);
    if (!isNaN(num) && num >= 0) {
      setForm((f) => ({ ...f, [k]: num }));
    } else if (normalized === "" || normalized === ".") {
      setForm((f) => ({ ...f, [k]: 0 }));
    }
  };

  // Ao sair do campo (onBlur), formata o valor
  const handleNumericBlur = (k: keyof FormState) => {
    const num = form[k] as number;
    setRawValues((prev) => ({ ...prev, [k]: num === 0 ? "" : String(num) }));
  };

  // Cálculos de Lucro e Margem
  const cost = typeof form.costPrice === "number" ? form.costPrice : 0;
  const sale = typeof form.salePrice === "number" ? form.salePrice : 0;
  const hasCostAndSale = cost > 0 && sale > 0;
  const profitVal = sale - cost;
  const marginVal = sale > 0 ? (profitVal / sale) * 100 : 0;

  const profitDisplay = hasCostAndSale
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(profitVal)
    : "-";

  const marginDisplay = hasCostAndSale
    ? `${marginVal.toFixed(2).replace(".", ",")}%`
    : "-";

  const handleBarcodeChange = (raw: string) => {
    // Apenas números, max 13 caracteres
    const sanitized = raw.replace(/[^0-9]/g, "").slice(0, 13);
    updateString("barcode", sanitized);
  };

  const handleBarcodeValidation = async (code: string) => {
    if (!code) return;

    // 1. Checar duplicidade local
    const isDuplicate = products.some(
      (p) => p.barcode === code && (!isEdit || p.id !== productId)
    );

    if (isDuplicate) {
      toast.error("Este código de barras já está cadastrado em outro produto!");
      return;
    }

    // 2. Tentar buscar nome em API caso seja um EAN-13
    if (isValidEAN13(code)) {
      try {
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
        const data = await res.json();
        
        if (data.status === 1 && data.product && data.product.product_name) {
          toast.success("Nome do produto preenchido automaticamente pela base mundial!");
          setForm((prev) => ({
            ...prev,
            name: prev.name.length < 2 ? data.product.product_name : prev.name,
            image: !prev.image && data.product.image_url ? data.product.image_url : prev.image,
          }));
        }
      } catch {
        // Se a API externa falhar, não atrapalha o usuário
      }
    }
  };

  const barcodeExists =
    form.barcode.length > 0 &&
    products.some(
      (p) =>
        p.barcode === form.barcode &&
        (!isEdit || p.id !== productId)
    );

  // Validação dos campos obrigatórios
  const canSave =
    form.name.trim().length >= 2 &&
    form.categoryId.trim() !== "" &&
    form.unit.trim() !== "" &&
    (form.salePrice as number) > 0 &&
    !barcodeExists;

  const requiredInputClass =
    "border-primary/50 focus:ring-primary/50 bg-primary/[0.03]";

  const FormFields = (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 space-y-2">
        <Label>Nome</Label>
        <Input
          className={requiredInputClass}
          name="name"
          value={form.name}
          onChange={handleNameChange}
          placeholder="Nome do produto"
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label>Descrição</Label>
        <Textarea
          rows={2}
          value={form.description}
          onChange={(e) => updateString("description", e.target.value)}
        />
      </div>

      <div className="col-span-2 sm:col-span-1 space-y-2">
        <Label>Código (Alternativo)</Label>
        <Input
          name="sku"
          value={form.code}
          onChange={(e) => updateString("code", e.target.value)}
        />
      </div>

      <div className="col-span-2 sm:col-span-1 space-y-2">
        <Label>Código de Barras</Label>
        <div className="flex gap-2">
          <Input
            name="barcode"
            value={form.barcode}
            onChange={(e) => handleBarcodeChange(e.target.value)}
            onBlur={() => handleBarcodeValidation(form.barcode)}
            className={
              barcodeExists ? "border-red-500 focus-visible:ring-red-500" : ""
            }
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Gerar código interno"
            className="shrink-0"
            onClick={() => {
              const generated = generateInternalBarcode();
              updateString("barcode", generated);
              handleBarcodeValidation(generated);
            }}
          >
            <BoxIcon name="magic-wand" solid className="text-base text-foreground" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 sm:hidden"
            onClick={() => setIsScannerOpen(true)}
          >
            <BoxIcon name="barcode-reader" className="text-base text-foreground" />
          </Button>
        </div>
        {barcodeExists && (
          <p className="text-xs text-destructive flex items-center gap-1 mt-1">
            <BoxIcon name="error-circle" className="text-xs" /> Código de barras já existe em outro produto.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Unidade</Label>
        <Select
          value={form.unit || ""}
          onValueChange={handleUnitChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma unidade">
              {units.find((u) => u.abbreviation === form.unit)?.name ||
                form.unit}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {units.map((u) => (
              <SelectItem key={u.id} value={u.abbreviation}>
                {u.name} ({u.abbreviation})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Categoria</Label>
        <Select
          value={form.categoryId}
          onValueChange={(value) => updateString("categoryId", value as string)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma categoria">
              {categories.find((c) => c.id === form.categoryId)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Preço de venda</Label>
        <Input
          className={requiredInputClass}
          name="salePrice"
          inputMode="decimal"
          value={rawValues.salePrice}
          onChange={(e) => handleNumericChange("salePrice", e.target.value)}
          onBlur={() => handleNumericBlur("salePrice")}
          placeholder="00,00"
        />
      </div>

      {!productsSettings?.hideCostPrice && (
        <div className="space-y-2">
          <Label>Preço de custo</Label>
          <Input
            name="costPrice"
            inputMode="decimal"
            value={rawValues.costPrice}
            onChange={(e) => handleNumericChange("costPrice", e.target.value)}
            onBlur={() => handleNumericBlur("costPrice")}
            placeholder="00,00"
          />
        </div>
      )}

      {!productsSettings?.hideCostPrice && (
        <>
          <div className="space-y-2">
            <Label>Lucro</Label>
            <Input
              readOnly
              disabled
              value={profitDisplay}
              className="bg-muted cursor-not-allowed font-medium text-foreground disabled:opacity-100"
              placeholder="-"
            />
          </div>

          <div className="space-y-2">
            <Label>Margem de lucro</Label>
            <Input
              readOnly
              disabled
              value={marginDisplay}
              className="bg-muted cursor-not-allowed font-medium text-foreground disabled:opacity-100"
              placeholder="-"
            />
          </div>
        </>
      )}

      {(productsSettings?.trackStock ?? true) && (
        <>
          <div className="space-y-2">
            <Label>
              Estoque atual {getUnitDecimals(form.unit) === 0 ? "(Inteiro)" : "(Até 3 decimais)"}
            </Label>
            <Input
              name="stock"
              inputMode={getUnitDecimals(form.unit) === 0 ? "numeric" : "decimal"}
              step={getUnitDecimals(form.unit) === 0 ? "1" : "0.001"}
              value={rawValues.stock}
              onChange={(e) => handleStockNumericChange("stock", e.target.value)}
              onBlur={() => handleStockBlur("stock")}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>
              Estoque mínimo {getUnitDecimals(form.unit) === 0 ? "(Inteiro)" : "(Até 3 decimais)"}
            </Label>
            <Input
              name="minStock"
              inputMode={getUnitDecimals(form.unit) === 0 ? "numeric" : "decimal"}
              step={getUnitDecimals(form.unit) === 0 ? "1" : "0.001"}
              value={rawValues.minStock}
              onChange={(e) => handleStockNumericChange("minStock", e.target.value)}
              onBlur={() => handleStockBlur("minStock")}
              placeholder="0"
            />
          </div>
        </>
      )}

      <div className="col-span-2 space-y-2">
        <Label>Imagem do Produto</Label>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-border/70 bg-muted/20">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setImagePreview(url);
              }
            }}
          />
          {imagePreview ? (
            <div className="relative group shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Prévia do produto"
                className="h-20 w-20 rounded-xl object-cover border border-border shadow-xs"
              />
              <button
                type="button"
                onClick={() => {
                  setImagePreview("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:opacity-90 cursor-pointer"
                title="Remover imagem"
              >
                <BoxIcon name="x" className="text-xs" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center h-20 w-20 rounded-xl border border-dashed border-border hover:border-primary/50 bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors shrink-0 text-muted-foreground hover:text-foreground"
              title="Adicionar imagem"
            >
              <BoxIcon name="image-add" className="text-2xl" />
              <span className="text-[10px] mt-1 font-medium">Adicionar</span>
            </div>
          )}

          <div className="flex-1 w-full space-y-1.5">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <BoxIcon name="upload" className="mr-1 text-sm" />
                {imagePreview ? "Trocar imagem" : "Selecionar imagem"}
              </Button>
              {imagePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    setImagePreview("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remover
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Formatos suportados: PNG, JPG, WEBP (componente visual).
            </p>
          </div>
        </div>
      </div>

      <div className="col-span-2 space-y-2">
        <Label>Observações</Label>
        <Textarea
          rows={2}
          value={form.notes ?? ""}
          onChange={(e) => updateString("notes", e.target.value)}
        />
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-between gap-2">
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancelar
      </Button>
      <LoadingButton
        loading={busy}
        disabled={busy || !canSave}
        onClick={async () => {
          setBusy(true);
          try {
            await onSubmit(form);
            if (!isEdit) {
              localStorage.removeItem("@zelo-pdv/new-product-draft");
            }
          } finally {
            setBusy(false);
          }
        }}
      >
        Salvar
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={handleFormOpenChange} blur>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="shrink-0 px-4">
              <DrawerTitle>
                {isEdit ? "Editar produto" : "Novo produto"}
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pb-4">{FormFields}</div>
                </ScrollArea>
              </div>

              <div className="shrink-0 pt-3 flex flex-col gap-2 w-full border-t border-border">
                <LoadingButton
                  loading={busy}
                  disabled={busy || !canSave}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onSubmit(form);
                      if (!isEdit) {
                        localStorage.removeItem("@zelo-pdv/new-product-draft");
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="h-11 w-full rounded-full font-medium"
                >
                  Salvar
                </LoadingButton>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        <BarcodeScanner
          open={isScannerOpen}
          onOpenChange={handleScannerOpenChange}
          onScan={(barcode) => {
            const sanitized = barcode.replace(/[^0-9]/g, "").slice(0, 13);
            updateString("barcode", sanitized);
            handleBarcodeValidation(sanitized);
          }}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleFormOpenChange} blur>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {FormFields}
          <DialogFooter>{ActionButtons}</DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodeScanner
        open={isScannerOpen}
        onOpenChange={handleScannerOpenChange}
        onScan={(barcode) => {
          const sanitized = barcode.replace(/[^0-9]/g, "").slice(0, 13);
          updateString("barcode", sanitized);
          handleBarcodeValidation(sanitized);
        }}
      />
    </>
  );
}
