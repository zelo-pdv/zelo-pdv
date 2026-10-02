import { z } from "zod";

export const accessGroupSchema = z.object({
  name: z.string().min(1, "O nome do grupo é obrigatório"),
  description: z.string().optional().nullable(),
  active: z.boolean().default(true),
  permissions: z.record(z.string(), z.array(z.string())).default({}),
});

export const updateAccessGroupSchema = accessGroupSchema.partial();
