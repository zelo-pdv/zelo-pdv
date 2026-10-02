import { z } from "zod";

export const userContextSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string(),
  lojaId: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional().default({}),
  groupName: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

export type UserContextData = z.infer<typeof userContextSchema>;
