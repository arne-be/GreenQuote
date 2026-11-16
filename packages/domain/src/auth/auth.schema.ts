import { userRole } from "@greenquote/db/schema";
import { z } from "zod";

/** Name of the cookie that carries the session token; the web proxy checks for it. */
export const SESSION_COOKIE = "session";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name").max(200),
  email: emailSchema,
  // Length only, no composition rules (NIST SP 800-63B).
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Use at most 128 characters"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
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
