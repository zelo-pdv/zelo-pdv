import { z } from "zod";
import { SaleStatus } from "@/prisma/client";

export const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().positive("A quantidade deve ser maior que zero"),
  unitPrice: z.number().positive("O preço unitário deve ser maior que zero"),
});

export const saleSchema = z.object({
  clientId: z.string().optional().nullable(),
  clientName: z.string().max(100, "O nome do cliente é muito longo").optional().nullable(),
  items: z.array(saleItemSchema).min(1, "Adicione pelo menos um produto").max(500, "Muitos itens na venda"),
  total: z.number().nonnegative("O total não pode ser negativo"),
  discount: z.number().nonnegative().optional().nullable(),
  paymentMethod: z.string(),
  status: z.nativeEnum(SaleStatus),
  dueDate: z.string().max(30).optional().nullable(),
  notes: z.string().max(500, "A observação é muito longa").optional().nullable(),
}).refine((data) => {
  if (data.clientId) {
    return !!data.clientName && data.clientName.trim().length > 0;
  }
  return true;
}, {
  message: "O nome do cliente é obrigatório quando o cliente é selecionado",
  path: ["clientName"]
});

export type SaleFormValues = z.infer<typeof saleSchema>;
