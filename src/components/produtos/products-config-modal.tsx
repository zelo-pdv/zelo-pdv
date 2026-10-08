import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSettingsStore } from '@/store/useSettingsStore';
import { categoriesService } from '@/services/categories.service';
import { unitsService, Unit } from '@/services/units.service';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BoxIcon } from '@/components/ui/box-icon';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { GlobalLoader } from '@/components/ui/global-loader';

type UnitFormData = { name: string; abbreviation: string; decimalPlaces: number };

export function ProductsConfigModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const isMobile = useIsMobile();
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
    lowStockThreshold?: number | null;
  } | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryLowStockThreshold, setCategoryLowStockThreshold] = useState("");

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
      const payload = { 
        name: categoryName, 
        lowStockThreshold: categoryLowStockThreshold ? Number(categoryLowStockThreshold) : null 
      };

      if (editingCategory) {
        await categoriesService.update(editingCategory.id, payload);

        toast.success("Categoria atualizada!");
      } else {
        await categoriesService.create(payload);

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

  const openCategoryModal = (cat?: { id: string; name: string; lowStockThreshold?: number | null }) => {
    if (cat) {
      setEditingCategory(cat);

      setCategoryName(cat.name);
      setCategoryLowStockThreshold(cat.lowStockThreshold ? String(cat.lowStockThreshold) : "");
    } else {
      setEditingCategory(null);

      setCategoryName("");
      setCategoryLowStockThreshold("");
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


    
  if (!isOpen) return null;

  const content = (
    <div className="space-y-4 pt-4">
      
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

            <Separator className="my-1" />

            {/* Exibir / Ocultar Imagens dos Produtos */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <Label
                  className="text-sm font-medium cursor-pointer"
                  htmlFor="toggle-show-product-images"
                >
                  Exibir imagens dos produtos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exibe ou oculta as imagens e miniaturas de produtos na listagem de produtos, tela de vendas e demais páginas.
                </p>
              </div>
              <Switch
                id="toggle-show-product-images"
                checked={productsSettings.showProductImages ?? true}
                onCheckedChange={(checked) => {
                  setProductsSettings({ showProductImages: checked });
                  if (checked) {
                    toast.success("Exibição de imagens ativada");
                  } else {
                    toast.info("Exibição de imagens desativada");
                  }
                }}
              />
            </div>
          </div>

        {/* Navegação por Abas (Mobile e PC) */}
        <div className="flex rounded-lg bg-muted p-1 gap-1 w-full">
          <button
            type="button"
            onClick={() => setActiveProductTab("categories")}
            className={cn(
              "flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all text-center cursor-pointer",
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
              "flex-1 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all text-center cursor-pointer",
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
          <div className="w-full">
            {/* Categorias */}
            <div
              className={cn(
                "border rounded-md p-4 flex flex-col h-100",
                activeProductTab !== "categories" && "hidden"
              )}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold text-lg">Categorias</h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openCategoryModal()}
                >
                  <BoxIcon name="plus" className="mr-2 text-base" /> Nova Categoria
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
                        className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center bg-muted/50 px-3 py-2 rounded-md"
                      >
                        <span className="text-sm font-medium">{cat.name}</span>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] uppercase text-muted-foreground whitespace-nowrap hidden sm:block">Min.</Label>
                            <Input 
                              type="number" 
                              className="h-7 w-16 text-xs text-center" 
                              placeholder={String(productsSettings.globalLowStockThreshold ?? 5)}
                              value={productsSettings.categoryLowStockThresholds?.[cat.id] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const current = productsSettings.categoryLowStockThresholds || {};
                                if (!val) {
                                  const rest = { ...current };
                                  delete rest[cat.id];
                                  setProductsSettings({ categoryLowStockThresholds: rest });
                                } else {
                                  setProductsSettings({ categoryLowStockThresholds: { ...current, [cat.id]: Number(val) } });
                                }
                              }}
                              title="Estoque mínimo para esta categoria (deixe vazio para usar o padrão)"
                            />
                          </div>

                          <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCategoryModal(cat)}
                          >
                            <BoxIcon name="pencil" className="text-base text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            <BoxIcon name="trash" className="text-base text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
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
                activeProductTab !== "units" && "hidden"
              )}
            >
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="font-semibold text-lg">Unidades de Medida</h3>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openUnitModal()}
                >
                  <BoxIcon name="plus" className="mr-2 text-base" /> Nova Unidade
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
                            <BoxIcon name="pencil" className="text-base text-muted-foreground hover:text-foreground" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUnit(u.id)}
                          >
                            <BoxIcon name="trash" className="text-base text-muted-foreground hover:text-destructive" />
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

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Categoria</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Bebidas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo (Opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={categoryLowStockThreshold}
                    onChange={(e) => setCategoryLowStockThreshold(e.target.value)}
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define o nível de estoque baixo específico para produtos desta categoria.
                  </p>
                </div>
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

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome da Categoria</Label>
                  <Input
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Ex: Bebidas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estoque Mínimo (Opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    className="border-primary/50 focus:ring-primary/50 bg-primary/3"
                    value={categoryLowStockThreshold}
                    onChange={(e) => setCategoryLowStockThreshold(e.target.value)}
                    placeholder="Ex: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Define o nível de estoque baixo específico para produtos desta categoria.
                  </p>
                </div>
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
      
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
        <DrawerContent className="max-h-[85vh] p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Configurações de Produtos</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()} blur>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Produtos</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
