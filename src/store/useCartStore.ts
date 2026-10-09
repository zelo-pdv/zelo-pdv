import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Product, SaleItem, PaymentMethod, SaleStatus } from "@/types";
import { Client } from "@/prisma/client";

export type SaleStep = "cart" | "review" | "payment";

interface CartState {
  client: Client | null;
  items: SaleItem[];
  step: SaleStep;
  payment: PaymentMethod;
  status: SaleStatus;
  dueDate: string;
  notes: string;
  setClient: (c: Client | null) => void;
  addProduct: (p: Product, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  setStep: (s: SaleStep) => void;
  setPayment: (p: PaymentMethod) => void;
  setStatus: (s: SaleStatus) => void;
  setDueDate: (d: string) => void;
  setNotes: (n: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      client: null,
      items: [],
      step: "cart",
      payment: PaymentMethod.PIX,
      status: SaleStatus.PAGO,
      dueDate: "",
      notes: "",
      setClient: (c) => set({ client: c }),
      addProduct: (p, qty = 1) =>
        set((s) => {
          const unitPrice = Number(p.salePrice);
          const existing = s.items.find((it) => it.productId === p.id);
          if (existing) {
            return {
              items: s.items.map((it) =>
                it.productId === p.id
                  ? { ...it, quantity: it.quantity + qty }
                  : it,
              ),
            };
          }
          return {
            items: [
              ...s.items,
              {
                productId: p.id,
                productName: p.name,
                quantity: qty,
                unitPrice,
              },
            ],
          };
        }),
      updateQty: (productId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((it) => it.productId !== productId)
              : s.items.map((it) =>
                  it.productId === productId ? { ...it, quantity: qty } : it,
                ),
        })),
      removeItem: (productId) =>
        set((s) => ({
          items: s.items.filter((it) => it.productId !== productId),
        })),
      setStep: (step) => set({ step }),
      setPayment: (payment) => set({ payment }),
      setStatus: (status) => set({ status }),
      setDueDate: (dueDate) => set({ dueDate }),
      setNotes: (notes) => set({ notes }),
      clear: () =>
        set({
          client: null,
          items: [],
          step: "cart",
          payment: PaymentMethod.PIX,
          status: SaleStatus.PAGO,
          dueDate: "",
          notes: "",
        }),
    }),
    {
      name: "revenda-cart-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : (undefined as unknown as Storage),
      ),
      partialize: (s) => ({
        client: s.client,
        items: s.items,
        step: s.step,
        payment: s.payment,
        status: s.status,
        dueDate: s.dueDate,
        notes: s.notes,
      }),
      skipHydration: true,
    },
  ),
);

if (typeof window !== "undefined") {
  void useCartStore.persist.rehydrate();
}
