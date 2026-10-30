import { z } from "zod";
export const authInput = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  password: z.string().min(8, "密码至少 8 位").max(1024),
});
