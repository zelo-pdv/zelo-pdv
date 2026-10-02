import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Digite um e-mail válido.").max(100, "O e-mail é muito longo."),
  password: z.string().min(1, "A senha é obrigatória.").max(100, "A senha é muito longa."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
