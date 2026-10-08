"use client";

import { useEffect, useState } from "react";
import { BoxIcon } from "@/components/ui/box-icon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PaymentMethod, PAYMENT_LABELS, SaleStatus, type Product } from "@/types";
import { getLoja, updateLoja } from "@/services/loja.service";
import { productsService } from "@/services/products.service";
import {
  LojaAddressFormData,
  LojaFormData,
  lojaSchema,
} from "@/lib/validations/loja";
import { maskCep, maskCpfCnpj, maskPhone } from "@/lib/masks";
import { currency } from "@/lib/format";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/components/auth/permissions-provider";
import { GroupsSection } from "@/components/configuracoes/groups-section";

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
        <BoxIcon name="loader-alt" className="text-3xl bx-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <StoreSection />
      <NotificationsSection />
      <SalesConfigSection />
      <GroupsSection />
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
        const data = await getLoja();

        if (data && (data as { id?: string }).id) {
          setLojaId((data as { id?: string }).id ?? null);

          const storeData: LojaFormData = {
            name: data.name || "",
            ownerName: data.ownerName || "",
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
        toast.error("Loja não encontrada para atualizar.");
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
            <CardTitle className="text-base font-semibold">Dados da loja</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <BoxIcon
              name="chevron-down"
              className={cn(
                "text-base transition-transform duration-200",
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
              <h4 className="text-sm font-semibold">
                Endereço da loja (para cupom e comprovante)
              </h4>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
              <BoxIcon
                name="chevron-down"
                className={cn(
                  "text-base transition-transform duration-200",
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
                      <BoxIcon name="loader-alt" className="text-xs bx-spin" /> Buscando...
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
            <CardTitle className="text-base font-semibold">Notificações e Avisos</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <BoxIcon
              name="chevron-down"
              className={cn(
                "text-base transition-transform duration-200",
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
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const productsSettings = useSettingsStore((s) => s.products);
  const trackStock = productsSettings?.trackStock ?? true;
  const salesSettings = useSettingsStore((s) => s.sales) ?? {
    requireClient: false,
    blockOutOfStock: false,
    defaultPaymentMethod: PaymentMethod.DINHEIRO,
    paymentMethods: Object.values(PaymentMethod),
  };
  const setSalesSettings = useSettingsStore((s) => s.setSalesSettings);

  const paymentMethods = salesSettings.paymentMethods?.length > 0 ? salesSettings.paymentMethods : Object.values(PaymentMethod);

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.trim()) return;
    const formatted = newPaymentMethod.trim().toUpperCase().replace(/\s+/g, "_");
    if (paymentMethods.includes(formatted)) {
      toast.error("Forma de pagamento já existe");
      return;
    }
    setSalesSettings({ paymentMethods: [...paymentMethods, formatted] });
    setNewPaymentMethod("");
    toast.success("Forma de pagamento adicionada");
  };

  const handleRemovePaymentMethod = (method: string) => {
    if (paymentMethods.length <= 1) {
      toast.error("Deve haver pelo menos uma forma de pagamento");
      return;
    }
    const newMethods = paymentMethods.filter(m => m !== method);
    setSalesSettings({ 
      paymentMethods: newMethods,
      ...(salesSettings.defaultPaymentMethod === method && { defaultPaymentMethod: newMethods[0] })
    });
    toast.success("Forma de pagamento removida");
  };

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

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (isExpanded && productsList.length === 0) {
      void productsService.list().then((res: any) => {
        setProductsList(res || []);
      });
    }
  }, [isExpanded, productsList.length]);

  const handleToggleOpenPrice = (checked: boolean) => {
    setSalesSettings({ openPriceEnabled: checked });
    if (checked) {
      toast.success("Preço aberto na venda ativado");
    } else {
      toast.info("Preço aberto na venda desativado");
    }
  };

  const handleSetOpenPriceMode = (mode: "ALL" | "SPECIFIC") => {
    setSalesSettings({ openPriceMode: mode });
  };

  const handleToggleProductOpenPrice = (productId: string) => {
    const current = salesSettings.openPriceProductIds || [];
    const exists = current.includes(productId);
    const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
    setSalesSettings({ openPriceProductIds: updated });
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
            <CardTitle className="text-base font-semibold">Configurações de Venda</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
            <BoxIcon
              name="chevron-down"
              className={cn(
                "text-base transition-transform duration-200",
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

          {/* Preço Aberto na hora da venda */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/70 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  className="text-sm font-medium cursor-pointer"
                  htmlFor="toggle-open-price"
                >
                  Permitir alteração de preço na venda (Preço Aberto)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Permite editar o valor unitário do produto na primeira etapa da venda (no carrinho), sem alterar o preço cadastrado no produto.
                </p>
              </div>
              <Switch
                id="toggle-open-price"
                checked={salesSettings.openPriceEnabled ?? false}
                onCheckedChange={handleToggleOpenPrice}
              />
            </div>

            {salesSettings.openPriceEnabled && (
              <div className="mt-2 space-y-3 pt-3 border-t border-border/60 animate-in fade-in-50 duration-150">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Abrangência do Preço Aberto
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={(salesSettings.openPriceMode ?? "ALL") === "ALL" ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => handleSetOpenPriceMode("ALL")}
                    >
                      Todos os produtos (Global)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={salesSettings.openPriceMode === "SPECIFIC" ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => handleSetOpenPriceMode("SPECIFIC")}
                    >
                      Produtos específicos
                    </Button>
                  </div>
                </div>

                {salesSettings.openPriceMode === "SPECIFIC" && (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-3 border border-border/60">
                    <Label className="text-xs font-medium">
                      Selecione os produtos com preço aberto:
                    </Label>
                    <Input
                      placeholder="Buscar produto por nome ou código..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {productsList
                        .filter((p) =>
                          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
                        )
                        .map((p) => {
                          const isSelected = (salesSettings.openPriceProductIds || []).includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleToggleProductOpenPrice(p.id)}
                              className={cn(
                                "flex items-center justify-between rounded-md p-2 text-xs cursor-pointer border transition",
                                isSelected
                                  ? "border-primary bg-primary/10 font-medium text-foreground"
                                  : "border-border/60 bg-background hover:bg-muted"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <BoxIcon
                                  name={isSelected ? "check-square" : "square"}
                                  className={cn("text-sm", isSelected ? "text-primary" : "text-muted-foreground")}
                                />
                                <span className="truncate">{p.name}</span>
                              </div>
                              <span className="shrink-0 text-muted-foreground tabular-nums">
                                {currency(Number(p.salePrice))}
                              </span>
                            </div>
                          );
                        })}
                      {productsList.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2 text-center">
                          Nenhum produto cadastrado.
                        </p>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {(salesSettings.openPriceProductIds || []).length} produto(s) selecionado(s) com preço aberto.
                    </div>
                  </div>
                )}
              </div>
            )}
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
                {paymentMethods.map((pm) => (
                  <option key={pm} value={pm}>
                    {PAYMENT_LABELS[pm] || pm.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Item #X: Formas de pagamento habilitadas */}
          <div className="flex flex-col gap-4 rounded-xl border border-border/70 p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Formas de pagamento cadastradas</Label>
              <p className="text-xs text-muted-foreground">
                Adicione ou remova métodos de pagamento aceitos na loja.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((pm) => (
                <div key={pm} className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  <span>{PAYMENT_LABELS[pm] || pm.replace(/_/g, " ")}</span>
                  <button
                    onClick={() => handleRemovePaymentMethod(pm)}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                    title="Remover"
                  >
                    <BoxIcon name="x" className="text-sm" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-xs">
              <Input
                placeholder="Ex: TICKET"
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPaymentMethod()}
                className="h-9"
              />
              <Button type="button" size="sm" onClick={handleAddPaymentMethod} className="h-9 px-3 shrink-0">
                Adicionar
              </Button>
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
