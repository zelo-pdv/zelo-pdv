import type { ColumnDef } from "@tanstack/react-table";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AppUser } from "./page";

export type UserTableData = AppUser & {
  groupLabel: string;
  isFirstUser: boolean;
};

export type UserActions = {
  onToggle: (id: string) => void;
  onEdit: (u: AppUser) => void;
  onDelete: (u: AppUser) => void;
  onChangePassword: (u: AppUser) => void;
  currentUserId?: string;
};

export function getUserColumns({
  onToggle,
  onEdit,
  onDelete,
  onChangePassword,
  currentUserId,
}: UserActions): ColumnDef<UserTableData>[] {
  return [
    {
      accessorKey: "name",
      header: "Usuário",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="min-w-0 max-w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-2 min-w-0 max-w-[calc(100vw-130px)] sm:max-w-none">
                <span className="truncate text-sm font-medium">{u.name}</span>
              </div>
              <div className="sm:hidden shrink-0">
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BoxIcon name="dots-vertical-rounded" className="text-base" />
                      </Button>
                    }
                  ></PopoverTrigger>
                  <PopoverContent className="w-52" align="end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(u);
                      }}
                    >
                      <BoxIcon name="pencil" className="mr-2 text-base" />
                      Editar usuário
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-9 px-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangePassword(u);
                      }}
                    >
                      <BoxIcon name="key" className="mr-2 text-base" />
                      Trocar senha
                    </Button>
                    <Separator className="my-1" />
                    {u.id !== currentUserId && !u.isFirstUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-9 px-3 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(u);
                        }}
                      >
                        <BoxIcon name="trash" className="mr-2 text-base" />
                        Remover usuário
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">
              Escopo: {u.groupLabel}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "groupLabel",
      header: "Escopo",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground hidden sm:block">
          {row.original.groupLabel}
        </span>
      ),
      filterFn: (row, id, value) =>
        value === "Todos" || row.getValue(id) === value,
    },
    {
      accessorKey: "active",
      header: "Status",
      filterFn: "equals",
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      enableHiding: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="hidden justify-end gap-1 sm:flex">
            <Popover>
              <PopoverTrigger
                render={
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <BoxIcon name="cog" className="text-base" />
                  </Button>
                }
              ></PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Status do Usuário</div>
                    <div className="text-xs text-muted-foreground">
                      {u.active ? "Ativo no sistema" : "Acesso bloqueado"}
                    </div>
                  </div>
                  <Switch
                    checked={u.active}
                    onCheckedChange={() => onToggle(u.id)}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onEdit(u)}
              title="Editar usuário"
            >
              <BoxIcon name="pencil" className="text-base" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onChangePassword(u)}
              title="Trocar senha"
            >
              <BoxIcon name="key" className="text-base" />
            </Button>
            {u.id !== currentUserId && !u.isFirstUser && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(u)}
                title="Remover usuário"
              >
                <BoxIcon name="trash" className="text-base" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
