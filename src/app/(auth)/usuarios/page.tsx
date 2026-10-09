"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BoxIcon } from "@/components/ui/box-icon";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { z } from "zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GlobalLoader } from "@/components/ui/global-loader";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { getUserColumns} from "./columns";
import { UsersDataTable } from "./data-table";
import { maskPhone } from "@/lib/masks";

// Serviços
import { usersService } from "@/services/users.service";
import {
  getAccessGroups,
  type AccessGroupDTO,
} from "@/services/accessGroup.service";
import { getLoja } from "@/services/loja.service";
import { usePermissions } from "@/components/auth/permissions-provider";
import { useDataSync, notifyLocalSync } from "@/hooks/use-data-sync";
import { MobileActionFab } from "@/components/ui/mobile-action-fab";
import { handleExportUsers } from "@/lib/export";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  groupId: string;
  active: boolean;
  password?: string;
  phone?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  group?: AccessGroupDTO;
  isFirstUser?: boolean;
};

interface FormData {
  name: string;
  email: string;
  password?: string;
  phone?: string | null;
  groupId: string;
  active: boolean;
}

const emptyForm: FormData = {
  name: "",
  email: "",
  password: "",
  phone: "",
  groupId: "",
  active: true,
};

// Schema do Zod para Validação no Frontend
const userFormSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().optional(),
  phone: z.string().optional().nullable(),
  groupId: z.string().min(1, "Selecione um grupo de acesso"),
  active: z.boolean(),
});

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser, isAdmin } = usePermissions();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<AccessGroupDTO[]>([]);
  const [lojaOwnerId, setLojaOwnerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso restrito ao administrador.");
      router.replace("/dashboard");
    }
  }, [isAdmin, router]);

  const [editing, setEditing] = useState<AppUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AppUser | null>(null);
  const [passwordResetting, setPasswordResetting] = useState<AppUser | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    await handleExportUsers();
    setIsExporting(false);
  };

  const refreshData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [fetchedUsers, fetchedGroups, fetchedLoja] = await Promise.all([
        usersService.list(),
        getAccessGroups(),
        getLoja(),
      ]);
      setUsers(fetchedUsers);
      setGroups(fetchedGroups);
      setLojaOwnerId(fetchedLoja.ownerId || "");
    } catch (error) {
      if (!silent) {
        toast.error("Erro ao carregar os dados.");
      }
      console.error(error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData(false);
  }, []);

  // Sincronização em tempo real de usuários
  useDataSync({
    types: ["users"],
    onSync: () => {
      refreshData(true);
    },
  });

  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const group = groups.find((g) => g.id === u.groupId);
      return {
        ...u,
        groupLabel: group?.name || "Sem grupo",
        isFirstUser: u.id === lojaOwnerId,
      };
    });
  }, [users, groups, lojaOwnerId]);

  const columns = useMemo(
    () =>
      getUserColumns({
        onToggle: async (id) => {
          try {
            const user = users.find((u) => u.id === id);
            if (!user) return;
            const updated = await usersService.update(id, {
              active: !user.active,
            });
            setUsers((prev) =>
              prev.map((u) =>
                u.id === id ? { ...u, active: updated.active } : u,
              ),
            );
            toast.success("Status atualizado!");
            notifyLocalSync("users");

            if (currentUser && updated.id === currentUser.sub) {
              window.location.reload();
            }
          } catch {
            toast.error("Erro ao atualizar status.");
          }
        },
        onEdit: (u) => setEditing(u as AppUser),
        onDelete: (u) => setDeleting(u as AppUser),
        onChangePassword: (u) => setPasswordResetting(u as AppUser),
        currentUserId: currentUser?.sub,
      }),
    [users, currentUser],
  );

  if (!isAdmin) {
    return <GlobalLoader />;
  }

  if (isLoading) {
    return <GlobalLoader />;
  }

  return (
    <div className="px-4 w-full">
      <UsersDataTable
        columns={columns}
        data={enrichedUsers}
        groups={groups as any}
        onCreateClick={() => setCreating(true)}
        onExportClick={handleExport}
        isExporting={isExporting}
      />

      <MobileActionFab 
        onAdd={() => setCreating(true)} 
        onExport={handleExport} 
        isExporting={isExporting} 
      />


      <UserForm
        key={editing?.id ?? "new"}
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        initial={editing}
        groups={groups}
        onSuccess={(updatedUser, isEdit) => {
          if (isEdit) {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === updatedUser.id ? { ...u, ...updatedUser } : u,
              ),
            );
            notifyLocalSync("users");
            if (currentUser && updatedUser.id === currentUser.sub) {
              window.location.reload();
            }
          } else {
            setUsers((prev) => [updatedUser, ...prev]);
            notifyLocalSync("users");
          }
          setCreating(false);
          setEditing(null);
        }}
      />

      <DeleteUser
        user={deleting}
        onClose={() => setDeleting(null)}
        onSuccess={(id) => {
          setUsers((prev) => prev.filter((u) => u.id !== id));
          setDeleting(null);
          notifyLocalSync("users");
        }}
      />

      <ChangePasswordDialog
        user={passwordResetting}
        onClose={() => setPasswordResetting(null)}
      />
    </div>
  );
}

function UserForm({
  open,
  onOpenChange,
  initial,
  groups,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: AppUser | null;
  groups: AccessGroupDTO[];
  onSuccess: (user: AppUser, isEdit: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const DRAFT_KEY = "@zelo/new-user-draft";
  const LEGACY_DRAFT_KEY = "@zelo-pdv/new-user-draft";

  const [form, setForm] = useState<FormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!initial;

  // Carregar rascunho apenas na criação inicial
  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        email: initial.email,
        password: "",
        phone: initial.phone ? maskPhone(initial.phone) : "",
        groupId: initial.groupId,
        active: initial.active,
      });
    } else {
      const saved = localStorage.getItem(DRAFT_KEY) || localStorage.getItem(LEGACY_DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setForm({ ...emptyForm, ...parsed, password: "" });
        } catch {
          setForm(emptyForm);
        }
      } else {
        setForm(emptyForm);
      }
    }
  }, [initial, open]);

  // Salvar rascunho (somente se não for edição, e NUNCA salvar senha no localStorage)
  useEffect(() => {
    if (open && !initial) {
      const draftWithoutPassword = { ...form };
      delete (draftWithoutPassword as Record<string, unknown>).password;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftWithoutPassword));
    }
  }, [form, open, initial]);

  const selectableGroups = useMemo(() => {
    return groups.filter((g) => {
      if (g.name === "ADMIN") {
        return !!initial?.isFirstUser;
      }
      return true;
    });
  }, [groups, initial]);

  const submit = async () => {
    try {
      const validation = userFormSchema.safeParse(form);
      if (!validation.success) {
        return toast.error(validation.error.issues[0].message);
      }

      if (!isEdit && (!form.password || form.password.length < 6)) {
        return toast.error("A senha deve ter pelo menos 6 caracteres");
      }

      setIsSubmitting(true);

      if (isEdit && initial) {
        const updated = await usersService.update(initial.id, {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password ? form.password : undefined,
          phone: form.phone ? "+55" + form.phone.replace(/\D/g, "") : undefined,
          groupId: form.groupId,
          active: form.active,
        });
        toast.success("Usuário atualizado com sucesso!");
        onSuccess(updated, true);
      } else {
        const created = await usersService.create({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password!,
          phone: form.phone ? "+55" + form.phone.replace(/\D/g, "") : undefined,
          groupId: form.groupId,
          active: form.active,
        });
        toast.success("Usuário criado com sucesso!");
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(LEGACY_DRAFT_KEY);
        setForm(emptyForm);
        onSuccess(created, false);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao processar.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requiredInputClass =
    "border-primary/50 focus:ring-primary/50 bg-primary/[0.03]";

  const FormFields = (
    <div className="space-y-4">
      <div className="sm:col-span-2 space-y-2">
        <Label>Nome</Label>
        <Input
          className={requiredInputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex.: Ana Silva"
        />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label>E-mail</Label>
        <Input
          className={requiredInputClass}
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="usuario@minhaloja.com"
        />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label>Telefone</Label>
        <Input
          type="tel"
          value={form.phone || ""}
          onChange={(e) =>
            setForm({ ...form, phone: maskPhone(e.target.value) })
          }
          placeholder="(00) 00000-0000 "
          maxLength={15}
        />
      </div>
      <div className="sm:col-span-2 space-y-2">
        <Label>{isEdit ? "Nova Senha (Opcional)" : "Senha"}</Label>
        <div className="relative">
          <Input
            id="user-form-password"
            name="new-password"
            type={showPassword ? "text" : "password"}
            value={form.password ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder={
              isEdit
                ? "Deixe em branco para manter a atual"
                : "Mínimo 6 caracteres"
            }
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className={cn("pr-10", !isEdit && requiredInputClass)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <BoxIcon name="hide" className="text-base" />
            ) : (
              <BoxIcon name="show" className="text-base" />
            )}
          </button>
        </div>
      </div>
      <div className="sm:col-span-2 flex gap-4">
        <div className="flex-1 space-y-2">
          <Label>Tipo de acesso</Label>
          <Select
            value={form.groupId}
            onValueChange={(v) => setForm({ ...form, groupId: v as string })}
          >
            <SelectTrigger className={requiredInputClass}>
              <SelectValue placeholder="Selecione um grupo">
                {groups.find((g) => g.id === form.groupId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {selectableGroups.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhum grupo ativo cadastrado.
                </div>
              )}
              {selectableGroups.map((g) => (
                <SelectItem key={g.id} value={g.id!}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0 space-y-2">
          <Label>Usuário Ativo</Label>
          <div className="flex items-center gap-2 h-9">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <span className="text-sm text-muted-foreground min-w-12">
              {form.active ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex gap-2 w-full justify-between">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <LoadingButton onClick={submit} loading={isSubmitting} className="min-w-28">
        Salvar
      </LoadingButton>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} blur>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader className="shrink-0 px-4">
            <DrawerTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</DrawerTitle>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-6 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="pb-4">{FormFields}</div>
              </ScrollArea>
            </div>
            <div className="shrink-0 pt-3 flex flex-col gap-2 w-full border-t border-border">
              <LoadingButton
                onClick={submit}
                loading={isSubmitting}
                className="h-11 w-full rounded-full font-medium"
              >
                Salvar
              </LoadingButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} blur>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuário" : "Novo usuário"}</DialogTitle>
        </DialogHeader>
        {FormFields}
        <DialogFooter>{ActionButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUser({
  user,
  onClose,
  onSuccess,
}: {
  user: AppUser | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    try {
      setIsDeleting(true);
      await usersService.delete(user.id);
      toast.success("Usuário removido");
      onSuccess(user.id);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir usuário");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
          <AlertDialogDescription>
            {user?.name} perderá o acesso ao sistema. Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />
            ) : (
              "Remover"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ChangePasswordDialog({
  user,
  onClose,
}: {
  user: AppUser | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      setPassword("");
      setShowPassword(false);
    }
  }, [user]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user) return;
    if (password.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres");
    }

    try {
      setIsSubmitting(true);
      await usersService.update(user.id, {
        password: password,
      });
      toast.success("Senha alterada com sucesso!");
      notifyLocalSync("users");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ContentBody = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Nova Senha</Label>
        <div className="relative">
          <Input
            id="change-password-input"
            name="new-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <BoxIcon name="hide" className="text-base" />
            ) : (
              <BoxIcon name="show" className="text-base" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const ActionButtons = (
    <div className="flex w-full justify-between gap-2">
      <Button
        variant="outline"
        type="button"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="button"
        onClick={() => handleSubmit()}
        disabled={isSubmitting}
      >
        {isSubmitting && <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />}
        Salvar nova senha
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={!!user} onOpenChange={(o) => !o && onClose()} blur>
        <DrawerContent className="p-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>Trocar Senha</DrawerTitle>
            <p className="text-sm text-muted-foreground">
              Defina uma nova senha para o usuário <strong>{user?.name}</strong>
            </p>
          </DrawerHeader>
          {ContentBody}
          <div className="flex flex-col gap-2 pt-4 w-full">
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="h-11 w-full rounded-full font-medium"
            >
              {isSubmitting && <BoxIcon name="loader-alt" className="mr-2 text-base bx-spin" />}
              Salvar nova senha
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
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
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()} blur>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Trocar Senha</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Defina uma nova senha para o usuário <strong>{user?.name}</strong>
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {ContentBody}
          <DialogFooter>{ActionButtons}</DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
