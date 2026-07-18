import { z } from "zod";

const passwordPolicySchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export function parsePasswordChange(
  input: unknown,
): PasswordChangeInput | null {
  const result = passwordChangeSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function isValidAdminPassword(password: string): boolean {
  return passwordPolicySchema.safeParse(password).success;
}
