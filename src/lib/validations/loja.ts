import { z } from "zod";

export const lojaAddressSchema = z.object({
  street: z.string().optional().nullable().or(z.literal("")),
  number: z.string().optional().nullable().or(z.literal("")),
  complement: z.string().optional().nullable().or(z.literal("")),
  neighborhood: z.string().optional().nullable().or(z.literal("")),
  city: z.string().optional().nullable().or(z.literal("")),
  state: z.string().optional().nullable().or(z.literal("")),
  zipCode: z.string().optional().nullable().or(z.literal("")),
});

export const lojaSchema = z.object({
  name: z.string().min(1, "O nome da loja é obrigatório"),
  ownerName: z.string().min(1, "O nome do responsável é obrigatório"),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Formato de e-mail inválido")
    .optional()
    .nullable()
    .or(z.literal("")),
  document: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  active: z.boolean().default(true),
  address: lojaAddressSchema.optional().nullable(),
});

export type LojaAddressFormData = z.infer<typeof lojaAddressSchema>;
export type LojaFormData = z.infer<typeof lojaSchema>;
