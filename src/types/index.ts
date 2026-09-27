import { Prisma } from "@/prisma/client";

export type ClientWithAddress = Prisma.ClientGetPayload<{
  include: { address: true };
}>;

export type ClientesViewProps = {
  initialClients: ClientWithAddress[];
  sales: Sale[];
};

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  product?: {
    id?: string;
    code?: string;
    name?: string;
  };
}

export interface Sale {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  date: string; // ISO
  items: SaleItem[];
  total: number;
  discount?: number | null;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  dueDate?: string;
  notes?: string;
  sellerId?: string | null;
  seller?: {
    id: string;
    name: string;
  } | null;
}

export enum PaymentMethod {
  DINHEIRO = "DINHEIRO",
  PIX = "PIX",
  CARTAO_DE_CREDITO = "CARTAO_DE_CREDITO",
  CARTAO_DEBITO = "CARTAO_DEBITO",
}

export enum SaleStatus {
  PAGO = "PAGO",
  PENDENTE = "PENDENTE",
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.DINHEIRO]: "Dinheiro",
  [PaymentMethod.PIX]: "PIX",
  [PaymentMethod.CARTAO_DE_CREDITO]: "Cartão de Crédito",
  [PaymentMethod.CARTAO_DEBITO]: "Cartão de Débito",
};

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

export interface Product {
  id: string;
  code?: string | null;
  barcode?: string | null;
  name: string;
  salePrice: number | string;
  stock: number;
  image?: string | null;
  minStock?: number | null;
  category?: string | null;
  description?: string | null;
  costPrice?: number | null;
  notes?: string | null;
}
