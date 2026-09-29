"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Store as StoreIcon,
  ShieldCheck,
  MapPin,
  Loader2,
  ChevronDown,
  Bell,
  ShoppingCart,
  LayoutDashboard,
  Package,
  Download,
  Upload,
  FileSpreadsheet,
  FileDown,
  FileUp,
  AlertCircle,
  CheckCircle2,
  Users,
  UserCheck,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { GlobalLoader } from "@/components/ui/global-loader";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  MODULES,
  type AccessGroup,
  type ActionKey,
  type ModuleKey,
  type Permissions,
  useSettingsStore,
} from "@/store/useSettingsStore";
import { PaymentMethod, PAYMENT_LABELS, SaleStatus } from "@/types";
import {
  createAccessGroup,
  deleteAccessGroup,
  getAccessGroups,
  updateAccessGroup,
} from "@/services/accessGroup.service";
import { createLoja, getLoja, updateLoja } from "@/services/loja.service";
import {
  LojaAddressFormData,
  LojaFormData,
  lojaSchema,
} from "@/lib/validations/loja";
import { categoriesService } from "@/services/categories.service";
import { unitsService, Unit, UnitFormData } from "@/services/units.service";
import { usersService } from "@/services/users.service";
import { clientsService } from "@/services/clients.service";
import { productsService } from "@/services/products.service";
import { salesService } from "@/services/sales.service";
import { currency, dateTime } from "@/lib/format";
import { notifyLocalSync } from "@/hooks/use-data-sync";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/auth/permissions-provider";

export default function ConfiguracoesPage() {
  const { isAdmin } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso restrito ao administrador.");
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <StoreSection />
      <NotificationsSection />
      <SalesConfigSection />
      <DashboardConfigSection />
      <ProductsConfigSection />
      <GroupsSection />
      <DataImportExportSection />
    </div>
  );
}

function StoreSection() {
  const [lojaId, setLojaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const defaultAddress: LojaAddressFormData = {
    zipCode: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  };

  const defaultForm: LojaFormData = {
    name: "",
    ownerName: "",
    document: "",
    phone: "",
    email: "",
    logo: "",
    active: true,
    address: defaultAddress,
  };

  const [form, setForm] = useState<LojaFormData>(defaultForm);
  // Guardamos o estado original para habilitar/desabilitar o botão de Salvar e Cancelar
  const [original, setOriginal] = useState<LojaFormData>(defaultForm);
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        setLoading(true);
        const [data, users] = await Promise.all([
          getLoja(),
          usersService.list().catch(() => []),
        ]);

        const firstUser = users.reduce((oldest: any, current: any) => {
          if (!oldest) return current;
          const oldestDate = new Date(oldest.createdAt || 0);
          const currentDate = new Date(current.createdAt || 0);
          return currentDate < oldestDate ? current : oldest;
        }, null);

        const firstUserName = firstUser?.name || "";

        if (data && (data as { id?: string }).id) {
          setLojaId((data as { id?: string }).id ?? null);

          const storeData: LojaFormData = {
            name: data.name || "",
            ownerName: firstUserName || data.ownerName || "",
            document: data.document ? maskCpfCnpj(data.document) : "",
            phone: data.phone ? maskPhone(data.phone) : "",
            email: data.email || "",
            logo: data.logo || "",
            active: data.active ?? true,
            address: {
              zipCode: data.address?.zipCode
                ? maskCep(data.address.zipCode)
                : "",
              street: data.address?.street || "",
              number: data.address?.number || "",
              complement: data.address?.complement || "",
              neighborhood: data.address?.neighborhood || "",
              city: data.address?.city || "",
              state: data.address?.state || "",
            },
          };

          setForm(storeData);
          setOriginal(storeData);
        }
      } catch (error: any) {
        // Ignora erros de "Não encontrado" (404), pois é o comportamento esperado na primeira vez.
        // Se a sua API retorna um status HTTP, você pode usar: if (error.status !== 404)
        if (!error.message?.toLowerCase().includes("não encontrada")) {
          console.error(error);
          toast.error("Erro ao carregar dados da loja");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchStoreData();
  }, []);

  const update = <K extends keyof LojaFormData>(k: K, v: LojaFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const updateAddress = (field: keyof LojaAddressFormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      address: {
        ...(prev.address || defaultAddress),
        [field]: value,
      },
    }));
  };

  const buscarCep = async (cep: string) => {
    const rawCep = cep.replace(/\D/g, "");
    if (rawCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
      if (!response.ok) throw new Error("Erro ao consultar CEP");
      const data = await response.json();
      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        address: {
          ...(prev.address || defaultAddress),
          street: data.logradouro || prev.address?.street || "",
          neighborhood: data.bairro || prev.address?.neighborhood || "",
          city: data.localidade || prev.address?.city || "",
          state: data.uf || prev.address?.state || "",
          complement: data.complemento || prev.address?.complement || "",
        },
      }));
      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Não foi possível buscar o CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  // O botão só será habilitado se houve mudança, não estiver salvando e os campos obrigatórios estiverem preenchidos
  const canSave =
    dirty && !busy && form.name.trim() !== "" && form.ownerName.trim() !== "";

  const handleSave = async () => {
    // 1. Validação do Zod
    const dataToSave: LojaFormData = {
      ...form,
      phone: form.phone ? "+55" + form.phone.replace(/\D/g, "") : "",
      document: form.document ? form.document.replace(/\D/g, "") : "",
      address: form.address
        ? {
            ...form.address,
            zipCode: form.address.zipCode
              ? form.address.zipCode.replace(/\D/g, "")
              : "",
          }
        : undefined,
    };
    const parsed = lojaSchema.safeParse(dataToSave);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
      return;
    }

    setBusy(true);
    try {
      // 2. Persistência via API (Create ou Update)
      if (lojaId) {
        await updateLoja(lojaId, parsed.data);
        toast.success("Dados da loja atualizados com sucesso");
      } else {
        const novaLoja = await createLoja(parsed.data);
        // Salvamos o novo ID retornado pela API para que os próximos envios sejam um "Update"
        setLojaId((novaLoja as { id: string }).id);
        toast.success("Loja cadastrada com sucesso");
      }

      // 3. Atualiza o estado original para refletir a nova base de dados salva
      setOriginal(form);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar os dados da loja");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <GlobalLoader />;
  }

  const requiredInputClass =
    "border-primary/50 focus:ring-primary/50 bg-primary/3";

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsSectionExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isSectionExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <StoreIcon className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold">Dados da loja</CardTitle>
            {!isSectionExpanded && form.name && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                • {form.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <span>{isSectionExpanded ? "Minimizar" : "Ver dados da loja"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isSectionExpanded && "rotate-180"
              )}
            />
          </div>
        </button>
      </CardHeader>
      {isSectionExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Nome da loja</Label>
            <Input
              className={requiredInputClass}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Ex.: Boutique Bella"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Responsável</Label>
            <Input
              className="bg-muted/50 cursor-not-allowed"
              value={form.ownerName}
              disabled
              title="O responsável é sempre o primeiro usuário admin da conta."
              placeholder="Nome do responsável"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Documento (CNPJ/CPF)</Label>
            <Input
              value={form.document || ""}
              onChange={(e) =>
                update("document", maskCpfCnpj(e.target.value))
              }
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Telefone</Label>
            <Input
              type="tel"
              value={form.phone || ""}
              onChange={(e) =>
                update("phone", maskPhone(e.target.value))
              }
              placeholder="(00) 00000-0000 "
              maxLength={15}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email || ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>URL da Logo</Label>
            <Input
              value={form.logo || ""}
              onChange={(e) => update("logo", e.target.value)}
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
        </div>

        {/* Seção de Endereço (Minimizável) */}
        <div className="pt-4 border-t border-border/60">
          <button
            type="button"
            onClick={() => setIsAddressExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between py-1 text-left cursor-pointer group hover:opacity-80 transition-opacity"
            aria-expanded={isAddressExpanded}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <h4 className="text-sm font-semibold">
                Endereço da loja (para cupom e comprovante)
              </h4>
              {form.address?.city && !isAddressExpanded && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  • {form.address.street ? `${form.address.street}, ` : ""}{form.address.city}/{form.address.state || ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
              <span>{isAddressExpanded ? "Minimizar" : "Ver endereço"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isAddressExpanded && "rotate-180"
                )}
              />
            </div>
          </button>

          {isAddressExpanded && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-3 animate-in fade-in-50 duration-150">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>CEP</Label>
                  {cepLoading && (
                    <span className="flex items-center text-xs text-muted-foreground gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </div>
                <Input
                  placeholder="00000-000"
                  value={form.address?.zipCode || ""}
                  onChange={(e) => {
                    const val = maskCep(e.target.value);
                    updateAddress("zipCode", val);
                    if (val.replace(/\D/g, "").length === 8) {
                      buscarCep(val);
                    }
                  }}
                  onBlur={(e) => buscarCep(e.target.value)}
                  maxLength={9}
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Logradouro (Rua / Av.)</Label>
                <Input
                  placeholder="Ex.: Rua dos Equipamentos"
                  value={form.address?.street || ""}
                  onChange={(e) => updateAddress("street", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Número</Label>
                <Input
                  placeholder="Ex.: 9"
                  value={form.address?.number || ""}
                  onChange={(e) => updateAddress("number", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Complemento</Label>
                <Input
                  placeholder="Ex.: Sobreloja 101"
                  value={form.address?.complement || ""}
                  onChange={(e) => updateAddress("complement", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Bairro</Label>
                <Input
                  placeholder="Ex.: Centro"
                  value={form.address?.neighborhood || ""}
                  onChange={(e) => updateAddress("neighborhood", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label>Cidade</Label>
                <Input
                  placeholder="Ex.: Rio de Janeiro"
                  value={form.address?.city || ""}
                  onChange={(e) => updateAddress("city", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Estado (UF)</Label>
                <Input
                  placeholder="Ex.: RJ"
                  maxLength={2}
                  value={form.address?.state || ""}
                  onChange={(e) =>
                    updateAddress("state", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-3 mt-2">
          <p className="text-xs text-muted-foreground text-right max-w-sm">
            Nota: Algumas atualizações nos dados da loja podem exigir que você
            saia e entre novamente no sistema para serem visualizadas.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={!dirty || busy}
              onClick={() => setForm(original)}
            >
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleSave}
              disabled={!canSave}
              loading={busy}
            >
              Salvar
            </LoadingButton>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}

function NotificationsSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const notifications = useSettingsStore((s) => s.notifications) ?? {
    enableToasts: true,
    outOfStockWarning: true,
  };
  const setNotificationSettings = useSettingsStore(
    (s) => s.setNotificationSettings,
  );

  const handleToggleOutOfStockWarning = (checked: boolean) => {
    setNotificationSettings({ outOfStockWarning: checked });
    if (checked) {
      toast.success("Avisos de estoque insuficiente ativados");
    } else {
      toast.info("Avisos de estoque insuficiente desativados");
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Bell className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold">Notificações e Avisos</CardTitle>
            {!isExpanded && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                • Aviso sem estoque: {notifications.outOfStockWarning ? "ativado" : "desativado"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <span>{isExpanded ? "Minimizar" : "Configurar"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
          {/* Toggle Específico para Produtos Sem Estoque */}
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border border-border/70 p-4 transition-opacity",
              !trackStock && "opacity-50 pointer-events-none",
            )}
          >
            <div className="space-y-0.5 pr-4">
              <Label
                className="text-sm font-medium cursor-pointer"
                htmlFor="toggle-stock-warning"
              >
                Avisos de produto sem estoque
              </Label>
              <p className="text-xs text-muted-foreground">
                {!trackStock
                  ? "Controle de estoque desativado nas configurações de produtos."
                  : "Exibe um aviso em toast ao selecionar ou alterar a quantidade de um produto com estoque insuficiente."}
              </p>
            </div>
            <Switch
              id="toggle-stock-warning"
              disabled={!trackStock}
              checked={trackStock && notifications.outOfStockWarning}
              onCheckedChange={handleToggleOutOfStockWarning}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function SalesConfigSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const salesSettings = useSettingsStore((s) => s.sales) ?? {
    requireClient: false,
    blockOutOfStock: false,
    defaultPaymentMethod: PaymentMethod.DINHEIRO,
  };
  const setSalesSettings = useSettingsStore((s) => s.setSalesSettings);

  const handleToggleRequireClient = (checked: boolean) => {
    setSalesSettings({ requireClient: checked });
    if (checked) {
      toast.success("Seleção de cliente agora é obrigatória nas vendas");
    } else {
      toast.info("Vendas sem cliente (Consumidor Final) agora são permitidas");
    }
  };

  const handleToggleBlockOutOfStock = (checked: boolean) => {
    setSalesSettings({ blockOutOfStock: checked });
    if (checked) {
      toast.success("Vendas com estoque insuficiente agora serão bloqueadas");
    } else {
      toast.info("Vendas com estoque insuficiente agora são permitidas com aviso");
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ShoppingCart className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold">Configurações de Venda</CardTitle>
            {!isExpanded && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                • Pgto padrão: {PAYMENT_LABELS[salesSettings.defaultPaymentMethod || PaymentMethod.DINHEIRO]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <span>{isExpanded ? "Minimizar" : "Configurar"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
          {/* Forçar seleção de cliente */}
          <div className="flex items-center justify-between rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label
                className="text-sm font-medium cursor-pointer"
                htmlFor="toggle-require-client"
              >
                Forçar seleção de cliente
              </Label>
              <p className="text-xs text-muted-foreground">
                Torna obrigatório vincular um cliente cadastrado antes de finalizar a venda. Quando desativado, permite vendas rápidas para &quot;Consumidor Final&quot;.
              </p>
            </div>
            <Switch
              id="toggle-require-client"
              checked={salesSettings.requireClient}
              onCheckedChange={handleToggleRequireClient}
            />
          </div>

          {/* Item #1: Bloquear venda com estoque zerado */}
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border border-border/70 p-4 transition-opacity",
              !trackStock && "opacity-50 pointer-events-none"
            )}
          >
            <div className="space-y-0.5 pr-4">
              <Label
                className="text-sm font-medium cursor-pointer"
                htmlFor="toggle-block-out-of-stock"
              >
                Bloquear venda com estoque zerado
              </Label>
              <p className="text-xs text-muted-foreground">
                {!trackStock
                  ? "Controle de estoque desativado nas configurações de produtos."
                  : "Proíbe adicionar ao carrinho ou vender produtos sem estoque disponível. Quando desativado, apenas exibe um aviso em toast."}
              </p>
            </div>
            <Switch
              id="toggle-block-out-of-stock"
              disabled={!trackStock}
              checked={trackStock && salesSettings.blockOutOfStock}
              onCheckedChange={handleToggleBlockOutOfStock}
            />
          </div>

          {/* Item #2: Forma de pagamento padrão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium">
                Forma de pagamento padrão
              </Label>
              <p className="text-xs text-muted-foreground">
                Define qual método de pagamento já vem pré-selecionado ao abrir o checkout de nova venda.
              </p>
            </div>
            <div className="shrink-0">
              <select
                value={salesSettings.defaultPaymentMethod || PaymentMethod.DINHEIRO}
                onChange={(e) => {
                  const method = e.target.value as PaymentMethod;
                  setSalesSettings({ defaultPaymentMethod: method });
                  toast.success(`Forma de pagamento padrão: ${PAYMENT_LABELS[method] || method}`);
                }}
                className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                {Object.values(PaymentMethod).map((pm) => (
                  <option key={pm} value={pm}>
                    {PAYMENT_LABELS[pm] || pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item #3: Status padrão da venda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium">
                Status padrão da venda
              </Label>
              <p className="text-xs text-muted-foreground">
                Define se uma nova venda já abre com status &quot;Pago&quot; ou &quot;Pendente&quot;.
              </p>
            </div>
            <div className="shrink-0">
              <select
                value={salesSettings.defaultSaleStatus || SaleStatus.PAGO}
                onChange={(e) => {
                  const newStatus = e.target.value as SaleStatus;
                  setSalesSettings({ defaultSaleStatus: newStatus });
                  toast.success(
                    `Status padrão da venda: ${newStatus === SaleStatus.PAGO ? "Pago" : "Pendente"}`
                  );
                }}
                className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value={SaleStatus.PAGO}>Pago</option>
                <option value={SaleStatus.PENDENTE}>Pendente</option>
              </select>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DashboardConfigSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const dashboard = useSettingsStore((s) => s.dashboard) ?? {
    defaultPeriod: "today",
    recentSalesCount: 5,
    hideLowStockCard: false,
  };
  const setDashboardSettings = useSettingsStore((s) => s.setDashboardSettings);

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <LayoutDashboard className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold">Configurações do Dashboard</CardTitle>
            {!isExpanded && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                • Período: {dashboard.defaultPeriod === "month" ? "Este mês" : dashboard.defaultPeriod === "week" ? "Últimos 7 dias" : "Hoje"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <span>{isExpanded ? "Minimizar" : "Configurar"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
          {/* Item #5: Período de referência padrão dos cards */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium">
                Período de referência padrão dos cards
              </Label>
              <p className="text-xs text-muted-foreground">
                Define o período padrão exibido nos cards de métricas do dashboard ao entrar no sistema.
              </p>
            </div>
            <div className="shrink-0">
              <select
                value={dashboard.defaultPeriod || "today"}
                onChange={(e) => {
                  const val = e.target.value as "today" | "week" | "month";
                  setDashboardSettings({ defaultPeriod: val });
                  toast.success("Período padrão do dashboard atualizado");
                }}
                className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="today">Hoje (Dia atual)</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Este mês</option>
              </select>
            </div>
          </div>

          {/* Item #6: Número de vendas recentes */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5 pr-4">
              <Label className="text-sm font-medium">
                Número de vendas recentes
              </Label>
              <p className="text-xs text-muted-foreground">
                Quantidade de vendas listadas na seção &quot;Últimas vendas&quot; do dashboard.
              </p>
            </div>
            <div className="shrink-0">
              <select
                value={String(dashboard.recentSalesCount || 5)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDashboardSettings({ recentSalesCount: val });
                  toast.success(`Exibindo até ${val} vendas recentes no dashboard`);
                }}
                className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value="5">5 vendas</option>
                <option value="10">10 vendas</option>
                <option value="20">20 vendas</option>
              </select>
            </div>
          </div>

          {/* Item #7: Ocultar card Estoque Baixo */}
          <div
            className={cn(
              "flex items-center justify-between rounded-xl border border-border/70 p-4 transition-opacity",
              !trackStock && "opacity-50 pointer-events-none"
            )}
          >
            <div className="space-y-0.5 pr-4">
              <Label
                className="text-sm font-medium cursor-pointer"
                htmlFor="toggle-hide-low-stock"
              >
                Ocultar indicador de estoque baixo
              </Label>
              <p className="text-xs text-muted-foreground">
                {!trackStock
                  ? "Controle de estoque desativado nas configurações de produtos (card já ocultado automaticamente)."
                  : "Oculta o card e a lista de produtos com estoque baixo no dashboard (ideal para quem não controla estoque mínimo)."}
              </p>
            </div>
            <Switch
              id="toggle-hide-low-stock"
              disabled={!trackStock}
              checked={!trackStock || dashboard.hideLowStockCard}
              onCheckedChange={(checked) => {
                setDashboardSettings({ hideLowStockCard: checked });
                if (checked) {
                  toast.info("Card de estoque baixo ocultado no dashboard");
                } else {
                  toast.success("Card de estoque baixo visível no dashboard");
                }
              }}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function GroupsSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AccessGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await getAccessGroups();
      const nonAdminGroups = (data as AccessGroup[]).filter(
        (g) => g.name !== "ADMIN",
      );
      setGroups(nonAdminGroups);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar grupos de acesso");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleToggleActive = async (group: AccessGroup) => {
    try {
      const updated = await updateAccessGroup(group.id, {
        active: !group.active,
      });
      setGroups(
        groups.map((g) => (g.id === group.id ? (updated as AccessGroup) : g)),
      );
      toast.success("Status do grupo atualizado");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccessGroup(id);
      setGroups(groups.filter((g) => g.id !== id));
      toast.success("Grupo removido com sucesso");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao remover grupo");
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex flex-1 items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity mr-3"
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-base font-semibold">Grupos de acesso</CardTitle>
              {!isExpanded && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  • {groups.length} grupo{groups.length === 1 ? "" : "s"} configurado{groups.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
              <span>{isExpanded ? "Minimizar" : "Gerenciar"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </button>
          {isExpanded && (
            <Button
              size="sm"
              className="rounded-full shrink-0"
              onClick={() => setCreating(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-2 pt-0 animate-in fade-in-50 duration-150">
          {loading ? (
            <GlobalLoader />
          ) : groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhum grupo cadastrado.
            </div>
          ) : (
            groups.map((g) => {
              const total = totalPermissions(g.permissions as Permissions);
              return (
                <div
                  key={g.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-medium">{g.name}</div>
                      <Badge
                        variant="outline"
                        className={
                          g.active
                            ? "border-emerald-500/40 text-emerald-700"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }
                      >
                        {g.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {total} permiss{total === 1 ? "ão" : "ões"}
                      </span>
                    </div>
                    {g.description && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-2 pr-2">
                      <Switch
                        checked={g.active}
                        onCheckedChange={() => handleToggleActive(g)}
                        aria-label="Ativar grupo"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditing(g)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                      ></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover grupo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {g.name} será removido. Esta ação não pode ser
                            desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(g.id)}>
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      )}

      <GroupForm
        open={creating || !!editing}
        initial={editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        onSuccess={fetchGroups}
      />
    </Card>
  );
}

function totalPermissions(p: Permissions): number {
  return Object.values(p).reduce((acc, arr) => acc + (arr?.length ?? 0), 0);
}

interface FormData {
  name: string;
  description: string;
  active: boolean;
  permissions: Permissions;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  active: true,
  permissions: {},
};

function GroupForm({
  open,
  initial,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  initial: AccessGroup | null;
  onOpenChange: (o: boolean) => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              name: initial.name,
              description: initial.description || "",
              active: initial.active,
              permissions: { ...(initial.permissions as Permissions) },
            }
          : emptyForm,
      );
    }
  }, [open, initial]);

  const isEdit = !!initial;

  const toggleAction = (mod: ModuleKey, action: ActionKey) => {
    setForm((f) => {
      const current = f.permissions[mod] ?? [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...f, permissions: { ...f.permissions, [mod]: next } };
    });
  };

  const setAllForModule = (mod: ModuleKey, all: boolean) => {
    setForm((f) => {
      const actions = MODULES.find((m) => m.key === mod)!.actions.map(
        (a) => a.key,
      );
      return {
        ...f,
        permissions: { ...f.permissions, [mod]: all ? actions : [] },
      };
    });
  };

  const totalSelected = useMemo(
    () => totalPermissions(form.permissions),
    [form.permissions],
  );

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do grupo");
      return;
    }

    try {
      setSaving(true);
      if (isEdit && initial) {
        await updateAccessGroup(initial.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          active: form.active,
          permissions: form.permissions,
        });
        toast.success("Grupo atualizado com sucesso");
      } else {
        await createAccessGroup({
          name: form.name.trim(),
          description: form.description.trim(),
          active: form.active,
          permissions: form.permissions,
        });
        toast.success("Grupo criado com sucesso");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar grupo");
    } finally {
      setSaving(false);
    }
  };

  const isMobile = useIsMobile();

  const FormFields = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-col gap-2">
          <Label>Nome</Label>
          <Input
            className="border-primary/50 focus:ring-primary/50 bg-primary/3"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Vendedor"
          />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-2">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Para que serve este grupo?"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border/70 p-3 sm:col-span-2">
          <div>
            <div className="text-sm font-medium">Status</div>
            <div className="text-xs text-muted-foreground">
              Grupos inativos não concedem acesso aos usuários.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {form.active ? "Ativo" : "Inativo"}
            </span>
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Permissões por módulo</div>
            <div className="text-xs text-muted-foreground">
              Selecione as ações permitidas em cada página do sistema.
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalSelected} selecionada{totalSelected === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-2">
          {MODULES.map((mod) => {
            const selected = form.permissions[mod.key] ?? [];
            const allChecked = selected.length === mod.actions.length;
            const someChecked = selected.length > 0 && !allChecked;
            return (
              <div
                key={mod.key}
                className="rounded-lg border border-border/70 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        allChecked ? true : someChecked ? undefined : false
                      }
                      onCheckedChange={(v) =>
                        setAllForModule(mod.key, v === true)
                      }
                      aria-label={`Selecionar todas de ${mod.label}`}
                    />
                    <div className="text-sm font-medium">{mod.label}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {selected.length}/{mod.actions.length}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-4">
                  {mod.actions.map((a) => {
                    const checked = selected.includes(a.key);
                    const id = `${mod.key}-${a.key}`;
                    return (
                      <label
                        key={a.key}
                        htmlFor={id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-border"
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() =>
                            toggleAction(mod.key, a.key)
                          }
                        />
                        {a.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-between gap-2 sm:justify-end">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={saving}
      >
        Cancelar
      </Button>
      <LoadingButton
        onClick={submit}
        disabled={!form.name.trim() || saving}
        loading={saving}
      >
        Salvar
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} blur>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4">
            <DrawerTitle>{isEdit ? "Editar grupo" : "Adicionar"}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4 pt-1">{FormFields}</div>
              </ScrollArea>
            </div>
            <div className="shrink-0 pt-4 border-t border-border">
              {ActionButtons}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} blur>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar grupo" : "Adicionar"}</DialogTitle>
        </DialogHeader>

        {FormFields}

        <DialogFooter>{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsConfigSection() {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const productsSettings = useSettingsStore((s) => s.products) ?? {
    trackStock: true,
    globalLowStockThreshold: 5,
    hideCostPrice: false,
  };
  const setProductsSettings = useSettingsStore((s) => s.setProductsSettings);

  const [thresholdInput, setThresholdInput] = useState(
    String(productsSettings.globalLowStockThreshold ?? 5)
  );

  useEffect(() => {
    if (productsSettings.globalLowStockThreshold !== undefined) {
      setThresholdInput(String(productsSettings.globalLowStockThreshold));
    }
  }, [productsSettings.globalLowStockThreshold]);

  const [activeProductTab, setActiveProductTab] = useState<"categories" | "units">("categories");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(true);

  // States for Category Modal

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [categoryName, setCategoryName] = useState("");

  // States for Unit Modal

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [unitForm, setUnitForm] = useState<UnitFormData>({
    name: "",
    abbreviation: "",
    decimalPlaces: 0,
  });

  const [savingCategory, setSavingCategory] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [cats, uns] = await Promise.all([
        categoriesService.list(),
        unitsService.getUnits(),
      ]);
      setCategories((cats as any[]) || []);
      setUnits((uns as any[]) || []);
    } catch {
      toast.error("Erro ao carregar configurações de produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category Actions

  const handleSaveCategory = async () => {
    if (!categoryName.trim())
      return toast.error("O nome da categoria é obrigatório.");

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, {
          name: categoryName,
        });

        toast.success("Categoria atualizada!");
      } else {
        await categoriesService.create({ name: categoryName });

        toast.success("Categoria criada!");
      }

      setIsCategoryModalOpen(false);

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar categoria.");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta categoria?")) return;

    try {
      await categoriesService.delete(id);

      toast.success("Categoria removida.");

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover categoria.");
    }
  };

  const openCategoryModal = (cat?: { id: string; name: string }) => {
    if (cat) {
      setEditingCategory(cat);

      setCategoryName(cat.name);
    } else {
      setEditingCategory(null);

      setCategoryName("");
    }

    setIsCategoryModalOpen(true);
  };

  // Unit Actions

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim() || !unitForm.abbreviation.trim()) {
      return toast.error("Nome e sigla são obrigatórios.");
    }

    setSavingUnit(true);
    try {
      const payload = {
        ...unitForm,
        decimalPlaces: Number(unitForm.decimalPlaces),
      };

      if (editingUnit) {
        await unitsService.updateUnit(editingUnit.id, payload);

        toast.success("Unidade atualizada!");
      } else {
        await unitsService.createUnit(payload);

        toast.success("Unidade criada!");
      }

      setIsUnitModalOpen(false);

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar unidade.");
    } finally {
      setSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta unidade?")) return;

    try {
      await unitsService.deleteUnit(id);

      toast.success("Unidade removida.");

      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover unidade.");
    }
  };

  const openUnitModal = (u?: Unit) => {
    if (u) {
      setEditingUnit(u);

      setUnitForm({
        name: u.name,
        abbreviation: u.abbreviation,
        decimalPlaces: u.decimalPlaces,
      });
    } else {
      setEditingUnit(null);

      setUnitForm({ name: "", abbreviation: "", decimalPlaces: 0 });
    }

    setIsUnitModalOpen(true);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="py-4">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="h-4 w-4 text-primary shrink-0" />
            <CardTitle className="text-base font-semibold">Configurações de Produtos</CardTitle>
            {!isExpanded && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                • Estoque: {(productsSettings.trackStock ?? true) ? "Ativo" : "Desativado"} • {categories.length} categoria{categories.length === 1 ? "" : "s"} • {units.length} unidade{units.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <span>{isExpanded ? "Minimizar" : "Configurar"}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4 pt-0 animate-in fade-in-50 duration-150">
          {/* Parâmetros de Produtos */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/70 p-4">
            {/* Toggle Controlar Estoque */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  className="text-sm font-medium cursor-pointer"
                  htmlFor="toggle-track-stock"
                >
                  Controlar estoque de produtos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Ativa o controle e rastreamento de estoque. Ao desativar, oculta o estoque atual e mínimo, entradas de mercadoria e alertas em todo o sistema.
                </p>
              </div>
              <Switch
                id="toggle-track-stock"
                checked={productsSettings.trackStock ?? true}
                onCheckedChange={(checked) => {
                  setProductsSettings({ trackStock: checked });
                  if (checked) {
                    toast.success("Controle de estoque ativado");
                  } else {
                    toast.info("Controle de estoque desativado. Dados e ações de estoque foram ocultados.");
                  }
                }}
              />
            </div>

            <Separator className="my-1" />

            {/* Alerta global de estoque baixo (visível apenas se controle de estoque ativo) */}
            {(productsSettings.trackStock ?? true) && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-medium">
                      Alerta global de estoque baixo (unidades)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Quantidade padrão para alertar estoque baixo em produtos que não possuem estoque mínimo específico configurado.
                    </p>
                  </div>
                  <div className="w-32 shrink-0">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={thresholdInput}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, "");
                        setThresholdInput(onlyDigits);
                        if (onlyDigits !== "") {
                          const val = parseInt(onlyDigits, 10);
                          setProductsSettings({ globalLowStockThreshold: val });
                        }
                      }}
                      onBlur={() => {
                        if (thresholdInput === "" || isNaN(Number(thresholdInput))) {
                          setThresholdInput("0");
                          setProductsSettings({ globalLowStockThreshold: 0 });
                        } else {
                          const val = parseInt(thresholdInput, 10);
                          setThresholdInput(String(val));
                          setProductsSettings({ globalLowStockThreshold: val });
                        }
                      }}
                    />
                  </div>
                </div>

                <Separator className="my-1" />
              </>
            )}

            {/* Ocultar campo Preço de Custo */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  className="text-sm font-medium cursor-pointer"
                  htmlFor="toggle-hide-cost-price"
                >
                  Ocultar campo &quot;Preço de Custo&quot;
                </Label>
                <p className="text-xs text-muted-foreground">
                  Esconde o campo de preço de custo nos formulários de cadastro e edição de produtos.
                </p>
              </div>
              <Switch
                id="toggle-hide-cost-price"
                checked={productsSettings.hideCostPrice}
                onCheckedChange={(checked) => {
                  setProductsSettings({ hideCostPrice: checked });
                  if (checked) {
                    toast.info("Campo de preço de custo ocultado nos formulários");
                  } else {
                    toast.success("Campo de preço de custo visível nos formulários");
                  }
                }}
              />
            </div>
          </div>

        {/* Navegação por Abas no Mobile */}
        <div className="flex md:hidden rounded-lg bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveProductTab("categories")}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center",
              activeProductTab === "categories"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Categorias ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveProductTab("units")}
            className={cn(
              "flex-1 py-1.5 text-xs font-medium rounded-md transition-all text-center",
              activeProductTab === "units"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Unidades de Medida ({units.length})
          </button>
        </div>

        {loading ? (
          <GlobalLoader />
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Categorias */}
            <div
              className={cn(
                "border rounded-md p-4 flex flex-col h-100",
                activeProductTab !== "categories" && "hidden md:flex"
              )}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold text-lg">Categorias</h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCategoryModal()}
                >
                  <Plus className="w-4 h-4 mr-2" /> Nova Categoria
                </Button>
              </div>

              {categories.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma categoria cadastrada.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <ul className="space-y-2">
                    {categories.map((cat) => (
                      <li
                        key={cat.id}
                        className="flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md"
                      >
                        <span className="text-sm font-medium">{cat.name}</span>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCategoryModal(cat)}
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            {/* Unidades */}
            <div
              className={cn(
                "border rounded-md p-4 flex flex-col h-100",
                activeProductTab !== "units" && "hidden md:flex"
              )}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold text-lg">Unidades de Medida</h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUnitModal()}
                >
                  <Plus className="w-4 h-4 mr-2" /> Nova Unidade
                </Button>
              </div>

              {units.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground text-center">
                    Nenhuma unidade cadastrada.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0">
                  <ul className="space-y-2">
                    {units.map((u) => (
                      <li
                        key={u.id}
                        className="flex justify-between items-center bg-muted/50 px-3 py-2 rounded-md"
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{u.name}</span>

                          <span className="text-xs text-muted-foreground">
                            Sigla: {u.abbreviation} | Casas Decimais:{" "}
                            {u.decimalPlaces}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openUnitModal(u)}
                          >
                            <Pencil className="w-4 h-4 text-blue-500" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUnit(u.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          </div>
        )}

        {/* Modal / Drawer Categoria */}
        {isMobile ? (
          <Drawer
            open={isCategoryModalOpen}
            onOpenChange={setIsCategoryModalOpen}
            blur
          >
            <DrawerContent className="p-4">
              <DrawerHeader className="px-0">
                <DrawerTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DrawerTitle>
              </DrawerHeader>

              <div className="py-4 space-y-2">
                <Label>Nome da Categoria</Label>
                <Input
                  className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Bebidas"
                />
              </div>

              <div className="flex w-full justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancelar
                </Button>
                <LoadingButton
                  onClick={handleSaveCategory}
                  loading={savingCategory}
                >
                  Salvar
                </LoadingButton>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog
            open={isCategoryModalOpen}
            onOpenChange={setIsCategoryModalOpen}
            blur
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-2">
                <Label>Nome da Categoria</Label>
                <Input
                  className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Bebidas"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCategoryModalOpen(false)}
                >
                  Cancelar
                </Button>
                <LoadingButton
                  onClick={handleSaveCategory}
                  loading={savingCategory}
                >
                  Salvar
                </LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Modal / Drawer Unidade */}
        {isMobile ? (
          <Drawer open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen} blur>
            <DrawerContent className="p-4">
              <DrawerHeader className="px-0">
                <DrawerTitle>
                  {editingUnit ? "Editar Unidade" : "Nova Unidade"}
                </DrawerTitle>
              </DrawerHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={unitForm.name}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, name: e.target.value })
                    }
                    placeholder="Ex: Quilo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sigla</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={unitForm.abbreviation}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        abbreviation: e.target.value,
                      })
                    }
                    placeholder="Ex: KG"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Casas Decimais (0 a 3)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="3"
                    value={unitForm.decimalPlaces}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setUnitForm({
                        ...unitForm,
                        decimalPlaces: val ? Math.min(3, Number(val)) : 0,
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex w-full justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsUnitModalOpen(false)}
                >
                  Cancelar
                </Button>
                <LoadingButton onClick={handleSaveUnit} loading={savingUnit}>
                  Salvar
                </LoadingButton>
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen} blur>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUnit ? "Editar Unidade" : "Nova Unidade"}
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={unitForm.name}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, name: e.target.value })
                    }
                    placeholder="Ex: Quilo"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sigla</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={unitForm.abbreviation}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        abbreviation: e.target.value,
                      })
                    }
                    placeholder="Ex: KG"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Casas Decimais (0 a 3)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="3"
                    value={unitForm.decimalPlaces}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setUnitForm({
                        ...unitForm,
                        decimalPlaces: val ? Math.min(3, Number(val)) : 0,
                      });
                    }}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUnitModalOpen(false)}
                >
                  Cancelar
                </Button>
                <LoadingButton onClick={handleSaveUnit} loading={savingUnit}>
                  Salvar
                </LoadingButton>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
      )}
    </Card>
  );
}

function DataImportExportSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Modal de importação
  const [importModalType, setImportModalType] = useState<"products" | "clients" | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    errors: string[];
  } | null>(null);

  // Helper para download de CSV com UTF-8 BOM e delimitador ;
  const downloadCsv = (
    filename: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
  ) => {
    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const str = cell === null || cell === undefined ? "" : String(cell);
              return `"${str.replace(/"/g, '""')}"`;
            })
            .join(";"),
        ),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper para parser de CSV client-side
  const parseCsv = (text: string): Record<string, string>[] => {
    const cleanText = text.replace(/^\uFEFF/, "").trim();
    if (!cleanText) return [];

    const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolonCount >= commaCount ? ";" : ",";

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) =>
      h.replace(/^["']|["']$/g, "").trim(),
    );

    const records: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        let val = values[idx] ?? "";
        val = val.replace(/^["']|["']$/g, "").trim();
        obj[h] = val;
      });
      records.push(obj);
    }
    return records;
  };

  // 1. Exportações
  const handleExportClients = async () => {
    try {
      setExportingType("clients");
      const clients = await clientsService.list();
      if (!clients || clients.length === 0) {
        toast.warning("Nenhum cliente cadastrado para exportar.");
        return;
      }

      const headers = [
        "Nome",
        "Telefone",
        "E-mail",
        "Status",
        "CEP",
        "Logradouro",
        "Número",
        "Complemento",
        "Bairro",
        "Cidade",
        "UF",
        "Observações",
        "Cadastrado em",
      ];

      const rows = clients.map((c) => {
        const addr = Array.isArray(c.address) ? c.address[0] : c.address;
        return [
          c.name,
          maskPhone(c.phone),
          c.email || "",
          c.active ? "Ativo" : "Inativo",
          addr?.zipCode || "",
          addr?.street || "",
          addr?.number || "",
          addr?.complement || "",
          addr?.neighborhood || "",
          addr?.city || "",
          addr?.state || "",
          c.notes || "",
          c.createdAt ? new Date(c.createdAt).toLocaleDateString("pt-BR") : "",
        ];
      });

      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`clientes_zelo_${today}.csv`, headers, rows);
      toast.success(`${clients.length} cliente(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar clientes.");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportUsers = async () => {
    try {
      setExportingType("users");
      const users = await usersService.list();
      if (!users || users.length === 0) {
        toast.warning("Nenhum usuário cadastrado para exportar.");
        return;
      }

      const headers = [
        "Nome",
        "E-mail",
        "Telefone",
        "Grupo de Acesso",
        "Status",
        "Cadastrado em",
      ];

      const rows = users.map((u: any) => [
        u.name,
        u.email,
        maskPhone(u.phone),
        u.group?.name || "Sem grupo",
        u.active ? "Ativo" : "Inativo",
        u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-BR") : "",
      ]);

      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`usuarios_zelo_${today}.csv`, headers, rows);
      toast.success(`${users.length} usuário(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar usuários.");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportProducts = async () => {
    try {
      setExportingType("products");
      const products = await productsService.list();
      if (!products || products.length === 0) {
        toast.warning("Nenhum produto cadastrado para exportar.");
        return;
      }

      const headers = [
        "Nome",
        "Categoria",
        "Unidade",
        "Preço de Venda",
        "Preço de Custo",
        "Estoque",
        "Estoque Mínimo",
        "Código Interno",
        "Código de Barras",
        "Status",
        "Descrição",
      ];

      const rows = products.map((p: any) => [
        p.name,
        p.category?.name || "Geral",
        p.unit || "UN",
        currency(p.salePrice),
        currency(p.costPrice),
        Number(p.stock ?? 0),
        Number(p.minStock ?? 0),
        p.code || "",
        p.barcode || "",
        p.active ? "Ativo" : "Inativo",
        p.description || "",
      ]);

      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`produtos_zelo_${today}.csv`, headers, rows);
      toast.success(`${products.length} produto(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar produtos.");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportSales = async () => {
    try {
      setExportingType("sales");
      const sales = await salesService.list();
      if (!sales || sales.length === 0) {
        toast.warning("Nenhuma venda cadastrada para exportar.");
        return;
      }

      const headers = [
        "Número da Venda",
        "Data e Hora",
        "Cliente",
        "Forma de Pagamento",
        "Status",
        "Desconto",
        "Total",
      ];

      const rows = sales.map((s: any) => [
        s.saleNumber ? String(s.saleNumber) : s.id,
        dateTime(s.date),
        s.clientName || "Consumidor Final",
        PAYMENT_LABELS[s.paymentMethod as PaymentMethod] || s.paymentMethod,
        s.status === "PAGO" ? "Pago" : "Pendente",
        s.discount ? currency(s.discount) : "R$ 0,00",
        currency(s.total),
      ]);

      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(`vendas_zelo_${today}.csv`, headers, rows);
      toast.success(`${sales.length} venda(s) exportada(s) com sucesso!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao exportar vendas.");
    } finally {
      setExportingType(null);
    }
  };

  // 2. Modelos de Importação
  const handleDownloadProductTemplate = () => {
    const headers = [
      "Nome",
      "Categoria",
      "Unidade",
      "Preço de Venda",
      "Preço de Custo",
      "Estoque",
      "Estoque Mínimo",
      "Código Interno",
      "Código de Barras",
      "Descrição",
    ];

    const sampleRows = [
      [
        "Coca-Cola 2L",
        "Bebidas",
        "UN",
        "10,50",
        "7,00",
        "50",
        "10",
        "001",
        "7891234567890",
        "Refrigerante de cola garrafa 2L",
      ],
      [
        "Arroz Tipo 1 5kg",
        "Alimentos",
        "UN",
        "28,90",
        "21,00",
        "30",
        "5",
        "002",
        "7899876543210",
        "Arroz branco agulhinha",
      ],
      [
        "Detergente 500ml",
        "Limpeza",
        "UN",
        "2,80",
        "1,60",
        "100",
        "15",
        "003",
        "7891112223334",
        "Detergente líquido neutro",
      ],
    ];

    downloadCsv("modelo_importacao_produtos.csv", headers, sampleRows);
    toast.success("Modelo de produtos baixado com sucesso!");
  };

  const handleDownloadClientTemplate = () => {
    const headers = [
      "Nome",
      "Telefone",
      "E-mail",
      "CEP",
      "Logradouro",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "UF",
      "Observações",
    ];

    const sampleRows = [
      [
        "Maria Silva",
        "(79) 99999-8888",
        "maria.silva@exemplo.com",
        "49000-000",
        "Rua das Flores",
        "123",
        "Apto 101",
        "Centro",
        "Aracaju",
        "SE",
        "Cliente VIP",
      ],
      [
        "João Santos",
        "(79) 98888-7777",
        "joao.santos@exemplo.com",
        "49000-100",
        "Av. Principal",
        "456",
        "",
        "Jardins",
        "Aracaju",
        "SE",
        "Prefere contato via WhatsApp",
      ],
    ];

    downloadCsv("modelo_importacao_clientes.csv", headers, sampleRows);
    toast.success("Modelo de clientes baixado com sucesso!");
  };

  // 3. Processamento de Importação
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        toast.error("O arquivo selecionado está vazio ou não possui registros válidos.");
        setParsedRows([]);
        return;
      }
      setParsedRows(parsed);
      toast.info(`${parsed.length} linha(s) identificada(s) no arquivo.`);
    };
    reader.readAsText(file);
  };

  const handleStartImport = async () => {
    if (!importModalType || parsedRows.length === 0) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const endpoint =
        importModalType === "products"
          ? "/api/import/products"
          : "/api/import/clients";

      const payload =
        importModalType === "products"
          ? { products: parsedRows }
          : { clients: parsedRows };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar importação.");
      }

      setImportResult({
        importedCount: data.importedCount,
        errors: data.errors || [],
      });

      if (data.importedCount > 0) {
        notifyLocalSync(importModalType === "products" ? "products" : "clients");
      }

      if (data.errors && data.errors.length > 0) {
        toast.warning(
          `${data.importedCount} registro(s) importado(s), mas ${data.errors.length} linha(s) tiveram erro.`,
        );
      } else {
        toast.success(
          `Todos os ${data.importedCount} registro(s) foram importados com sucesso!`,
        );
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro durante a importação.");
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setImportModalType(null);
    setImportFile(null);
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="py-4">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between text-left cursor-pointer group hover:opacity-80 transition-opacity"
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
              <CardTitle className="text-base font-semibold">
                Importação e Exportação de Dados
              </CardTitle>
              {!isExpanded && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  • Exportar dados e importar via planilhas CSV
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
              <span>{isExpanded ? "Minimizar" : "Gerenciar"}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
          </button>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-6 pt-0 animate-in fade-in-50 duration-150">
            {/* Bloco 1: Exportação de Dados */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Download className="h-4 w-4 text-primary" />
                  Exportação de Dados
                </h3>
                <p className="text-xs text-muted-foreground">
                  Baixe planilhas completas em formato CSV com compatibilidade
                  direta com Excel e Google Planilhas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Clientes */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-3.5 bg-card/50">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Clientes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Nomes, telefones, e-mails, endereços e status.
                    </p>
                  </div>
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5"
                    onClick={handleExportClients}
                    loading={exportingType === "clients"}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Clientes (.csv)
                  </LoadingButton>
                </div>

                {/* Usuários */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-3.5 bg-card/50">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Usuários</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Contas de acesso, grupos de permissão e contatos.
                    </p>
                  </div>
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5"
                    onClick={handleExportUsers}
                    loading={exportingType === "users"}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Usuários (.csv)
                  </LoadingButton>
                </div>

                {/* Produtos */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-3.5 bg-card/50">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Produtos</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preços, estoques, categorias e códigos de barra.
                    </p>
                  </div>
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5"
                    onClick={handleExportProducts}
                    loading={exportingType === "products"}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Produtos (.csv)
                  </LoadingButton>
                </div>

                {/* Vendas */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-3.5 bg-card/50">
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Vendas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Histórico com número, data, cliente, forma e total.
                    </p>
                  </div>
                  <LoadingButton
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-medium gap-1.5"
                    onClick={handleExportSales}
                    loading={exportingType === "sales"}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar Vendas (.csv)
                  </LoadingButton>
                </div>
              </div>
            </div>

            <Separator />

            {/* Bloco 2: Importação de Dados */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-primary" />
                  Importação de Dados
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre dados em massa baixando o modelo .csv, preenchendo as
                  linhas e importando de volta para a sua conta.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Importação de Produtos */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-4 bg-card/50 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Produtos</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Importe o catálogo de produtos com categoria, estoque,
                      unidade e preços de custo e venda.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium gap-1.5 flex-1"
                      onClick={handleDownloadProductTemplate}
                    >
                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Baixar Modelo (.csv)
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs font-medium gap-1.5 flex-1"
                      onClick={() => setImportModalType("products")}
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Importar Produtos
                    </Button>
                  </div>
                </div>

                {/* Importação de Clientes */}
                <div className="flex flex-col justify-between rounded-xl border border-border/70 p-4 bg-card/50 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Clientes</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Importe a base de clientes com validação rigorosa de
                      unicidade de telefone e e-mail.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium gap-1.5 flex-1"
                      onClick={handleDownloadClientTemplate}
                    >
                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Baixar Modelo (.csv)
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs font-medium gap-1.5 flex-1"
                      onClick={() => setImportModalType("clients")}
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Importar Clientes
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Modal de Importação com Upload e Pré-visualização */}
      {importModalType && (
        <Dialog open={true} onOpenChange={(open) => !open && closeImportModal()}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <FileUp className="h-5 w-5 text-primary" />
                Importar {importModalType === "products" ? "Produtos" : "Clientes"}{" "}
                via CSV
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Instruções:</p>
                <p>
                  1. Utilize o modelo oficial .csv disponibilizado nas
                  configurações para evitar divergências.
                </p>
                <p>
                  2. O arquivo deve conter cabeçalho com os nomes das colunas e
                  delimitador ponto e vírgula (;) ou vírgula (,).
                </p>
                {importModalType === "clients" && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    Aviso: E-mails e telefones são validados de forma única no
                    sistema. Se já existirem, a respectiva linha será rejeitada.
                  </p>
                )}
              </div>

              {/* Input de Arquivo */}
              <div className="space-y-2">
                <Label htmlFor="csv-file-input">Selecione o arquivo .csv</Label>
                <Input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={isImporting}
                  className="cursor-pointer"
                />
              </div>

              {/* Resumo do Arquivo Pré-carregado */}
              {importFile && parsedRows.length > 0 && !importResult && (
                <div className="rounded-xl border border-border/80 p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-62.5">
                      {importFile.name}
                    </span>
                    <Badge variant="outline" className="text-primary text-[10px]">
                      {parsedRows.length} registro(s) encontrado(s)
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Colunas detectadas:{" "}
                    {Object.keys(parsedRows[0] || {}).join(", ")}
                  </div>
                </div>
              )}

              {/* Resultado após o processamento */}
              {importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {importResult.errors.length === 0 ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {importResult.importedCount} registro(s) importado(s) com
                      sucesso!
                    </span>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-destructive font-medium">
                        Ocorrências / Erros encontrados ({importResult.errors.length}):
                      </Label>
                      <ScrollArea className="h-32 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
                        <ul className="text-xs text-destructive space-y-1">
                          {importResult.errors.map((err, i) => (
                            <li key={i} className="flex items-start gap-1">
                              • {err}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={closeImportModal}
                disabled={isImporting}
              >
                {importResult ? "Fechar" : "Cancelar"}
              </Button>
              {!importResult && (
                <LoadingButton
                  onClick={handleStartImport}
                  disabled={!importFile || parsedRows.length === 0 || isImporting}
                  loading={isImporting}
                >
                  Confirmar e Importar
                </LoadingButton>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

