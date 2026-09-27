import { z } from "zod";
import { PaymentMethod, SaleStatus } from "@/prisma/client";

export const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive("A quantidade deve ser maior que zero"),
  unitPrice: z.number().positive("O preço unitário deve ser maior que zero"),
});

export const saleSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Adicione pelo menos um produto"),
  total: z.number().nonnegative("O total não pode ser negativo"),
  discount: z.number().nonnegative().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(SaleStatus),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type SaleFormValues = z.infer<typeof saleSchema>;
