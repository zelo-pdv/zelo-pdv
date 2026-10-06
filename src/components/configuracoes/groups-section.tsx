"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BoxIcon } from "@/components/ui/box-icon";
import { GlobalLoader } from "@/components/ui/global-loader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getAccessGroups, updateAccessGroup, deleteAccessGroup, createAccessGroup, AccessGroupDTO } from "@/services/accessGroup.service";
import { Permissions, ModuleKey, ActionKey } from "@/store/useSettingsStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { MODULES } from "@/store/useSettingsStore";

export function GroupsSection() {
  const [groups, setGroups] = useState<AccessGroupDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const [editing, setEditing] = useState<AccessGroupDTO | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await getAccessGroups();
      setGroups(data);
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleToggleActive = async (group: AccessGroupDTO) => {
    try {
      const updated = await updateAccessGroup(group.id as string, {
        active: !group.active,
      });
      setGroups(
        groups.map((g) => (g.id === group.id ? (updated as AccessGroupDTO) : g)),
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
              <BoxIcon name="shield-quarter" solid={isExpanded} className="text-base text-foreground shrink-0" />
              <CardTitle className="text-base font-semibold">Grupos de acesso</CardTitle>
              {!isExpanded && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  • {groups.length} grupo{groups.length === 1 ? "" : "s"} configurado{groups.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
              <span>{isExpanded ? "Minimizar" : "Gerenciar"}</span>
              <BoxIcon
                name="chevron-down"
                className={cn(
                  "text-base transition-transform duration-200",
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
              <BoxIcon name="plus" className="mr-1 text-base" /> Adicionar
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
                      <BoxIcon name="pencil" className="text-base" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                          >
                            <BoxIcon name="trash" className="text-base" />
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
                          <AlertDialogAction onClick={() => handleDelete(g.id as string)}>
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
  initial: AccessGroupDTO | null;
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

  const totalSelected = Object.values(form.permissions).reduce(
    (acc, arr) => acc + (arr?.length || 0),
    0,
  );

  const toggleAction = (mod: ModuleKey, action: ActionKey) => {
    setForm((prev) => {
      const perms = { ...prev.permissions };
      const arr = perms[mod] || [];
      if (arr.includes(action)) {
        perms[mod] = arr.filter((a) => a !== action);
      } else {
        perms[mod] = [...arr, action];
      }
      return { ...prev, permissions: perms };
    });
  };

  const setAllForModule = (mod: ModuleKey, all: boolean) => {
    setForm((prev) => {
      const perms = { ...prev.permissions };
      if (all) {
        perms[mod] = MODULES.find((m) => m.key === mod)?.actions.map(
          (a) => a.key,
        );
      } else {
        perms[mod] = [];
      }
      return { ...prev, permissions: perms };
    });
  };

  const submit = async () => {
    try {
      setSaving(true);
      if (isEdit && initial) {
        await updateAccessGroup(initial.id as string, {
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
                        setAllForModule(mod.key as ModuleKey, v === true)
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
                    const checked = selected.includes(a.key as any);
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
                            toggleAction(mod.key as ModuleKey, a.key as ActionKey)
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
      <Drawer open={open} onOpenChange={onOpenChange}>
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
