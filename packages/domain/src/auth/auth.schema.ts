import { userRole } from "@greenquote/db/schema";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: emailSchema,
  // Length only, no composition rules (NIST SP 800-63B).
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const userSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(userRole.enumValues),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type Actor = Pick<User, "id" | "role">;
