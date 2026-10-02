import z from "zod";

export const userFormSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório").max(100, "O nome é muito longo"),
  email: z.string().email("E-mail inválido").max(100, "O e-mail é muito longo"),
  password: z.string().max(100, "A senha é muito longa").optional(),
  phone: z.string().max(20, "O telefone é muito longo").optional().nullable(),
  avatar: z.string().max(255).optional().nullable(),
  groupId: z.string().min(1, "Selecione um grupo de acesso"),
  active: z.boolean(),
});

export type UserFormData = z.infer<typeof userFormSchema>;
