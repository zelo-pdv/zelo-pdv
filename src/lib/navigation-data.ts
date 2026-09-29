import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  DollarSign,
} from "lucide-react";

import type { ModuleKey } from "@/store/useSettingsStore";

export type NavItem = {
  to: string;
  label: string;
  short: string;
  icon: typeof LayoutDashboard;
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
    icon: LayoutDashboard,
    module: "dashboard",
  },
  {
    to: "/produtos",
    label: "Produtos",
    short: "Produtos",
    icon: Package,
    module: "produtos",
  },
  {
    to: "/nova-venda",
    label: "Nova Venda",
    short: "Vender",
    icon: DollarSign,
    primary: true,
    module: "nova-venda",
  },
  {
    to: "/clientes",
    label: "Clientes",
    short: "Clientes",
    icon: Users,
    module: "clientes",
  },
  {
    to: "/historico",
    label: "Histórico",
    short: "Vendas",
    icon: Receipt,
    module: "historico",
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    to: "/usuarios",
    label: "Usuários",
    short: "Usuários",
    icon: Users,
    adminOnly: true,
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    short: "Config",
    icon: Settings,
    adminOnly: true,
  },
];

export const TitlePages: TitlePage[] = [
  { label: "Dashboard", to: "/dashboard" },
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
    icon: Users,
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    short: "Config",
    icon: Settings,
  },
];
