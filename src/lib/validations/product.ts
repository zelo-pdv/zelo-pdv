import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "O nome da categoria deve ter no mínimo 2 caracteres")
    .max(50, "O nome da categoria é muito longo"),
  active: z.boolean().default(true),
  lowStockThreshold: z.coerce.number().min(0, "O valor mínimo é 0").optional().nullable(),
});

export const productSchema = z.object({
  code: z.string().max(50, "O código é muito longo").optional().nullable(),
  barcode: z.string().max(50, "O código de barras é muito longo").optional().nullable(),
  name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres").max(100, "O nome do produto é muito longo"),
  categoryId: z
    .string()
    .min(1, "A categoria é obrigatória")
    .nullable()
    .refine((v) => v !== null && v !== "", {
      message: "A categoria é obrigatória",
    }),
  description: z.string().max(500, "A descrição é muito longa").optional().nullable(),
  image: z.string().max(255).optional().nullable(),
  unit: z.string().min(1, "A unidade é obrigatória").max(10, "A unidade é muito longa"),
  costPrice: z.coerce.number().min(0, "O preço de custo não pode ser negativo").max(9999999, "Valor muito alto"),
  salePrice: z.coerce
    .number()
    .min(0.01, "O preço de venda é obrigatório e deve ser maior que zero")
    .max(9999999, "Valor muito alto"),
  stock: z.coerce.number().min(0, "O estoque não pode ser negativo").max(9999999, "Valor muito alto"),
  minStock: z.coerce.number().min(0, "O estoque mínimo não pode ser negativo").max(9999999, "Valor muito alto"),
  notes: z.string().max(500, "A observação é muito longa").optional().nullable(),
  active: z.boolean().default(true).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
