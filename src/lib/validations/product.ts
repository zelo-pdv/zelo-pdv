import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "O nome da categoria deve ter no mínimo 2 caracteres"),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  code: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  name: z.string().min(2, "O nome do produto deve ter pelo menos 2 caracteres"),
  categoryId: z
    .string()
    .min(1, "A categoria é obrigatória")
    .nullable()
    .refine((v) => v !== null && v !== "", {
      message: "A categoria é obrigatória",
    }),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  unit: z.string().min(1, "A unidade é obrigatória"),
  costPrice: z.coerce.number().min(0, "O preço de custo não pode ser negativo"),
  salePrice: z.coerce
    .number()
    .min(0.01, "O preço de venda é obrigatório e deve ser maior que zero"),
  stock: z.coerce.number().min(0, "O estoque não pode ser negativo"),
  minStock: z.coerce.number().min(0, "O estoque mínimo não pode ser negativo"),
  notes: z.string().optional().nullable(),
  active: z.boolean().default(true).optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
