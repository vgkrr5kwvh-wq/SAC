import { z } from "zod";
import { isValidAdminPassword } from "./admin-password-change";

const roleSchema = z.enum(["SUPER_ADMIN", "EDITOR", "STAFF"]);
const emailSchema = z.string().trim().email("Enter a valid email address.").max(191).transform((email) => email.toLowerCase());

export const createAdminUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: emailSchema,
  role: roleSchema,
  password: z.string().refine(isValidAdminPassword, "Use at least 12 characters with uppercase, lowercase, number, and special character."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match." });

export const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: emailSchema,
  role: roleSchema,
  isActive: z.boolean(),
});

export const resetAdminPasswordSchema = z.object({
  password: z.string().refine(isValidAdminPassword, "Use at least 12 characters with uppercase, lowercase, number, and special character."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match." });

export function isAdminUserId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{20,29}$/.test(value);
}

export type AdminUserFormState = { status: "idle" | "error"; message: string; errors: Record<string, string[]>; values: Record<string, string> };
export const initialAdminUserFormState: AdminUserFormState = { status: "idle", message: "", errors: {}, values: {} };
