import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { PaymentMethod, SaleStatus } from "@/types";

export type ModuleKey =
  | "dashboard"
  | "produtos"
  | "nova-venda"
  | "clientes"
  | "historico";

export type ActionKey = "Visualizar" | "Adicionar" | "Editar" | "Excluir";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  actions: { key: ActionKey; label: string }[];
}

export const MODULES: ModuleDef[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    actions: [{ key: "Visualizar", label: "Visualizar" }],
  },
  {
    key: "produtos",
    label: "Produtos",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Adicionar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
  {
    key: "nova-venda",
    label: "Nova Venda",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Registrar venda" },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Adicionar", label: "Adicionar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
  {
    key: "historico",
    label: "Histórico",
    actions: [
      { key: "Visualizar", label: "Visualizar" },
      { key: "Editar", label: "Editar" },
      { key: "Excluir", label: "Excluir" },
    ],
  },
];

export type Permissions = Partial<Record<ModuleKey, ActionKey[]>>;

export interface AccessGroup {
  id: string;
  name: string;
  description: string;
  active: boolean;
  permissions: Permissions;
  createdAt: string;
}

export interface StoreAddress {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface StoreInfo {
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  addressData?: StoreAddress | null;
  document: string;
}

export interface VoucherSettings {
  logo: string; // data URL
  resellerName: string;
  footerText: string;
  showContact: boolean;
}

export interface NotificationSettings {
  enableToasts: boolean;
  outOfStockWarning: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  enableToasts: true,
  outOfStockWarning: true,
};

export interface SalesSettings {
  requireClient: boolean;
  blockOutOfStock: boolean;
  defaultPaymentMethod: PaymentMethod;
  defaultSaleStatus: SaleStatus;
}

export const defaultSalesSettings: SalesSettings = {
  requireClient: false,
  blockOutOfStock: false,
  defaultPaymentMethod: PaymentMethod.DINHEIRO,
  defaultSaleStatus: SaleStatus.PAGO,
};

export type DashboardPeriod = "today" | "week" | "month";

export interface DashboardSettings {
  defaultPeriod: DashboardPeriod;
  recentSalesCount: number;
  hideLowStockCard: boolean;
}

export const defaultDashboardSettings: DashboardSettings = {
  defaultPeriod: "today",
  recentSalesCount: 5,
  hideLowStockCard: false,
};

export interface ProductsSettings {
  trackStock: boolean;
  globalLowStockThreshold: number;
  hideCostPrice: boolean;
}

export const defaultProductsSettings: ProductsSettings = {
  trackStock: true,
  globalLowStockThreshold: 5,
  hideCostPrice: false,
};

interface SettingsState {
  store: StoreInfo;
  groups: AccessGroup[];
  voucher: VoucherSettings;
  notifications: NotificationSettings;
  sales: SalesSettings;
  dashboard: DashboardSettings;
  products: ProductsSettings;
  setStore: (s: StoreInfo) => void;
  setVoucher: (v: VoucherSettings) => void;
  setNotificationSettings: (s: Partial<NotificationSettings>) => void;
  setSalesSettings: (s: Partial<SalesSettings>) => void;
  setDashboardSettings: (s: Partial<DashboardSettings>) => void;
  setProductsSettings: (s: Partial<ProductsSettings>) => void;
  addGroup: (g: Omit<AccessGroup, "id" | "createdAt">) => void;
  updateGroup: (id: string, g: Partial<AccessGroup>) => void;
  removeGroup: (id: string) => void;
  toggleGroup: (id: string) => void;
}

const uid = () => "g_" + Math.random().toString(36).slice(2, 10);

const defaultStore: StoreInfo = {
  name: "Minha Loja",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  document: "",
};

const defaultVoucher: VoucherSettings = {
  logo: "",
  resellerName: "",
  footerText: "Obrigado pela preferência! Documento sem valor fiscal.",
  showContact: true,
};

const allPerms = (): Permissions =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, m.actions.map((a) => a.key)]),
  ) as Permissions;

const viewOnly = (): Permissions =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, ["Visualizar" as ActionKey]]),
  ) as Permissions;

const defaultGroups: AccessGroup[] = [
  {
    id: "g_admin",
    name: "Administrador",
    description: "Acesso total a todos os módulos do sistema.",
    active: true,
    permissions: allPerms(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "g_vendedor",
    name: "Vendedor",
    description: "Pode registrar vendas e consultar produtos e clientes.",
    active: true,
    permissions: {
      dashboard: ["Visualizar"],
      produtos: ["Visualizar"],
      "nova-venda": ["Visualizar", "Adicionar"],
      clientes: ["Visualizar", "Adicionar"],
      historico: ["Visualizar"],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "g_consulta",
    name: "Somente consulta",
    description: "Permissão de visualização em todos os módulos.",
    active: false,
    permissions: viewOnly(),
    createdAt: new Date().toISOString(),
  },
];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      store: defaultStore,
      groups: defaultGroups,
      voucher: defaultVoucher,
      notifications: defaultNotificationSettings,
      sales: defaultSalesSettings,
      dashboard: defaultDashboardSettings,
      products: defaultProductsSettings,
      setStore: (s) => set({ store: s }),
      setVoucher: (v) => set({ voucher: v }),
      setNotificationSettings: (s) =>
        set((state) => ({
          notifications: {
            ...(state.notifications ?? defaultNotificationSettings),
            ...s,
          },
        })),
      setSalesSettings: (s) =>
        set((state) => ({
          sales: {
            ...(state.sales ?? defaultSalesSettings),
            ...s,
          },
        })),
      setDashboardSettings: (s) =>
        set((state) => ({
          dashboard: {
            ...(state.dashboard ?? defaultDashboardSettings),
            ...s,
          },
        })),
      setProductsSettings: (s) =>
        set((state) => ({
          products: {
            ...(state.products ?? defaultProductsSettings),
            ...s,
          },
        })),
      addGroup: (g) =>
        set((state) => ({
          groups: [
            { ...g, id: uid(), createdAt: new Date().toISOString() },
            ...state.groups,
          ],
        })),
      updateGroup: (id, g) =>
        set((state) => ({
          groups: state.groups.map((it) =>
            it.id === id ? { ...it, ...g } : it,
          ),
        })),
      removeGroup: (id) =>
        set((state) => ({ groups: state.groups.filter((it) => it.id !== id) })),
      toggleGroup: (id) =>
        set((state) => ({
          groups: state.groups.map((it) =>
            it.id === id ? { ...it, active: !it.active } : it,
          ),
        })),
    }),
    {
      name: "revenda-settings-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      skipHydration: true,
    },
  ),
);

if (typeof window !== "undefined") {
  void useSettingsStore.persist.rehydrate();
}
