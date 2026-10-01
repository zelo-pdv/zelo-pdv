import { createBoxIcon, type BoxIconComponent } from "@/components/ui/box-icon";
import type { ModuleKey } from "@/store/useSettingsStore";

export type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: BoxIconComponent;
  primary?: boolean;
  module?: ModuleKey;
  adminOnly?: boolean;
};

type TitlePage = {
  label: string;
  to: string;
};

export const NAV: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    short: "Início",
    icon: createBoxIcon("grid-alt"),
    module: "dashboard",
  },
  {
    to: "/produtos",
    label: "Produtos",
    short: "Produtos",
    icon: createBoxIcon("package"),
    module: "produtos",
  },
  {
    to: "/nova-venda",
    label: "Nova Venda",
    short: "Vender",
    icon: createBoxIcon("cart"),
    module: "nova-venda",
  },
  {
    to: "/clientes",
    label: "Clientes",
    short: "Clientes",
    icon: createBoxIcon("group"),
    module: "clientes",
  },
  {
    to: "/historico",
    label: "Histórico",
    short: "Vendas",
    icon: createBoxIcon("receipt"),
    module: "historico",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    to: "/usuarios",
    label: "Usuários",
    short: "Usuários",
    icon: createBoxIcon("user"),
    adminOnly: true,
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    short: "Config",
    icon: createBoxIcon("cog"),
    adminOnly: true,
  },
];

export const TitlePages: TitlePage[] = [
  { label: "Início", to: "/dashboard" },
  { label: "Produtos", to: "/produtos" },
  { label: "Nova Venda", to: "/nova-venda" },
  { label: "Clientes", to: "/clientes" },
  { label: "Histórico", to: "/historico" },
  { label: "Configurações", to: "/configuracoes" },
  { label: "Usuários", to: "/usuarios" },
];

export const SettingsItens: NavItem[] = [
  {
    to: "/usuarios",
    label: "Usuários",
    short: "Usuários",
    icon: createBoxIcon("user"),
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    short: "Config",
    icon: createBoxIcon("cog"),
  },
];

export function getFirstAccessibleRoute(
  canOrPermissions:
    | ((module: ModuleKey, action: "Visualizar" | "Adicionar" | "Editar" | "Excluir") => boolean)
    | { permissions?: any; isAdmin?: boolean }
): string {
  const sequence: { module: ModuleKey; to: string }[] = [
    { module: "dashboard", to: "/dashboard" },
    { module: "produtos", to: "/produtos" },
    { module: "nova-venda", to: "/nova-venda" },
    { module: "clientes", to: "/clientes" },
    { module: "historico", to: "/historico" },
  ];

  if (typeof canOrPermissions === "function") {
    const found = sequence.find((item) =>
      canOrPermissions(item.module, "Visualizar")
    );
    return found?.to || "/dashboard";
  }

  const { permissions, isAdmin } = canOrPermissions;
  if (isAdmin) return "/dashboard";

  const found = sequence.find(
    (item) => permissions?.[item.module]?.includes("Visualizar")
  );
  return found?.to || "/dashboard";
}

