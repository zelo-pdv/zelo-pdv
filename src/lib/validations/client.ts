import { z } from "zod";

// Schema de Endereço Estruturado
export const addressSchema = z.object({
  street: z.string().min(3, "Mínimo 3 caracteres").max(100).optional().or(z.literal("")),
  number: z.string().max(20).optional().or(z.literal("")),
  complement: z.string().max(50).optional().or(z.literal("")),
  neighborhood: z.string().max(50).optional().or(z.literal("")),
  city: z.string().min(2, "Cidade é obrigatória").max(50).optional().or(z.literal("")),
  state: z.string().min(2, "Estado é obrigatório").max(2).optional().or(z.literal("")),
  zipCode: z.string().max(20).optional().or(z.literal("")),
});

// Schema Base do Cliente (Sem ID, pois será gerado pelo Prisma)
export const clientFormSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório (mínimo 2 caracteres)").max(100),
  phone: z
    .string()
    .min(10, "Telefone inválido (mínimo 10 dígitos)")
    .max(20, "Telefone muito longo")
    .or(z.literal("")),
  email: z.string().email("E-mail inválido").max(100).optional().or(z.literal("")),
  address: addressSchema.optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
  active: z.boolean().default(true),
});
