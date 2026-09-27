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
import { ProductThumb } from "@/components/product-thumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/prisma/client";
import {  ScanBarcode, Wand2, AlertCircle } from "lucide-react";
import { usePermissions } from "@/components/auth/permissions-provider";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";

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
  const [products, setProducts] = useState<ProductFrontend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<ProductFrontend | null>(null);
  const [creating, setCreating] = useState(false);
  const [stockDialog, setStockDialog] = useState<ProductFrontend | null>(null);
  const [deleting, setDeleting] = useState<ProductFrontend | null>(null);

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

  const columns = useMemo(
    () =>
      getProductColumns({
        onStock: setStockDialog,
        onEdit: setEditing,
        onDelete: setDeleting,
        can,
      }),
    [can],
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
      />

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
                stock: editing.stock,
                minStock: editing.minStock,
                notes: editing.notes || "",
                barcode: editing.barcode || "",
                code: editing.code || "",
                unit: editing.unit || "UN",
                image: editing.image || "",
              }
            : {
                ...emptyForm,
                categoryId:
                  categories.find((c) => c.name === "Diversos")?.id || "",
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
            {product?.name} será removido do catálogo. Esta ação não pode ser
            desfeita.
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
        atual: {product.stock}
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
      <Drawer open={!!product} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Entrada de estoque</DrawerTitle>
          </DrawerHeader>
          {ContentBody}
          <div className="pt-2">{ActionButtons}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
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
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
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
            setRawValues({
              costPrice: parsed.costPrice === 0 ? "" : String(parsed.costPrice),
              salePrice: parsed.salePrice === 0 ? "" : String(parsed.salePrice),
              stock: parsed.stock === 0 ? "" : String(parsed.stock),
              minStock: parsed.minStock === 0 ? "" : String(parsed.minStock),
            });
          } catch {
            setForm(initial);
          }
        } else {
          setForm(initial);
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

  // Atualiza um campo de texto simples
  const updateString = (k: keyof FormState, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Para campos numéricos: mantém o rawValue durante digitação e só commita um número válido
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
          value={form.name}
          onChange={(e) => updateString("name", e.target.value)}
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
          value={form.code}
          onChange={(e) => updateString("code", e.target.value)}
        />
      </div>

      <div className="col-span-2 sm:col-span-1 space-y-2">
        <Label>Código de Barras</Label>
        <div className="flex gap-2">
          <Input
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
            <Wand2 className="w-4 h-4 text-blue-500" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 sm:hidden"
            onClick={() => setIsScannerOpen(true)}
          >
            <ScanBarcode className="w-4 h-4" />
          </Button>
        </div>
        {barcodeExists && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3" /> Código de barras já existe em outro produto.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Unidade</Label>
        <Select
          value={form.unit || ""}
          onValueChange={(value) => updateString("unit", value as string)}
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
          inputMode="decimal"
          value={rawValues.salePrice}
          onChange={(e) => handleNumericChange("salePrice", e.target.value)}
          onBlur={() => handleNumericBlur("salePrice")}
          placeholder="00,00"
        />
      </div>

      <div className="space-y-2">
        <Label>Preço de custo</Label>
        <Input
          inputMode="decimal"
          value={rawValues.costPrice}
          onChange={(e) => handleNumericChange("costPrice", e.target.value)}
          onBlur={() => handleNumericBlur("costPrice")}
          placeholder="00,00"
        />
      </div>

      <div className="space-y-2">
        <Label>Estoque atual</Label>
        <Input
          inputMode="decimal"
          value={rawValues.stock}
          onChange={(e) => handleNumericChange("stock", e.target.value)}
          onBlur={() => handleNumericBlur("stock")}
          placeholder="0"
        />
      </div>

      <div className="space-y-2">
        <Label>Estoque mínimo</Label>
        <Input
          inputMode="decimal"
          value={rawValues.minStock}
          onChange={(e) => handleNumericChange("minStock", e.target.value)}
          onBlur={() => handleNumericBlur("minStock")}
          placeholder="0"
        />
      </div>

      <div className="col-span-2 space-y-2">
        <Label>URL da Imagem</Label>
        <div className="flex items-center gap-3">
          <ProductThumb
            name={form.name || "P"}
            image={form.image}
            className="h-10 w-10 shrink-0 rounded-lg text-xs"
          />
          <Input
            value={form.image}
            onChange={(e) => updateString("image", e.target.value)}
            placeholder="https://exemplo.com/imagem.png"
            className="flex-1"
          />
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
        <Drawer open={open} onOpenChange={handleFormOpenChange}>
          <DrawerContent className="h-[90vh]">
            <DrawerHeader className="shrink-0 px-4">
              <DrawerTitle>
                {isEdit ? "Editar produto" : "Adicionar"}
              </DrawerTitle>
            </DrawerHeader>

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="pb-4">{FormFields}</div>
                </ScrollArea>
              </div>

              <div className="shrink-0 pt-4 border-t border-border">
                {ActionButtons}
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
      <Dialog open={open} onOpenChange={handleFormOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar produto" : "Adicionar"}</DialogTitle>
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
