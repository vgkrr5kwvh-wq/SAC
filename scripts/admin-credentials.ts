import { z } from "zod";

const adminEmailSchema = z
  .string()
  .trim()
  .email()
  .max(191)
  .transform((email) => email.toLowerCase());

const adminPasswordSchema = z
  .string()
  .min(12)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

export function normalizeAdminEmail(email: string): string {
  return adminEmailSchema.parse(email);
}

export function validateAdminPassword(password: string): string {
  return adminPasswordSchema.parse(password);
}
