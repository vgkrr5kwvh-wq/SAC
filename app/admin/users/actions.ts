"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminUserUpdateError, hasAdminPermission, requiresLastSuperAdminProtection } from "@/lib/admin-authorization";
import { createAdminUserSchema, isAdminUserId, resetAdminPasswordSchema, updateAdminUserSchema, type AdminUserFormState } from "@/lib/admin-user-management";
import { prisma } from "@/lib/prisma";

const bcryptWorkFactor = 12;
class ProtectedSuperAdminError extends Error {}
class SelfModificationError extends Error {}

function values(formData: FormData) {
  const safeValues = Object.fromEntries([...formData.entries()].filter(([key, value]) => typeof value === "string" && key !== "password" && key !== "confirmPassword").map(([key, value]) => [key, String(value)]));
  if (formData.has("email")) safeValues.isActive = formData.get("isActive") === "on" ? "true" : "false";
  return safeValues;
}
function failure(formData: FormData, message: string, errors: Record<string, string[]> = {}): AdminUserFormState { return { status: "error", message, errors, values: values(formData) }; }

async function superAdminSession() {
  const session = await auth();
  return session?.user && hasAdminPermission(session.user.role, "manage_users") ? session : null;
}

export async function createAdminUserAction(_state: AdminUserFormState, formData: FormData): Promise<AdminUserFormState> {
  const session = await superAdminSession();
  if (!session) return failure(formData, "You do not have permission to create users.");
  const parsed = createAdminUserSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), role: formData.get("role"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return failure(formData, "Please correct the highlighted fields.", parsed.error.flatten().fieldErrors);
  try {
    const passwordHash = await hash(parsed.data.password, bcryptWorkFactor);
    const user = await prisma.adminUser.create({ data: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, passwordHash }, select: { id: true } });
    revalidatePath("/admin/users");
    redirect(`/admin/users/${user.id}/edit?created=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(formData, "Please correct the highlighted fields.", { email: ["A user with this email already exists."] });
    return failure(formData, "Unable to create user.");
  }
}

export async function updateAdminUserAction(id: string, _state: AdminUserFormState, formData: FormData): Promise<AdminUserFormState> {
  const session = await superAdminSession();
  if (!session || !isAdminUserId(id)) return failure(formData, "Unable to update user.");
  const parsed = updateAdminUserSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), role: formData.get("role"), isActive: formData.get("isActive") === "on" });
  if (!parsed.success) return failure(formData, "Please correct the highlighted fields.", parsed.error.flatten().fieldErrors);
  try {
    await prisma.$transaction(async (transaction) => {
      const target = await transaction.adminUser.findUnique({ where: { id }, select: { id: true, role: true, isActive: true, email: true } });
      if (!target) throw new Error("Missing user");
      const activeSuperAdmins = requiresLastSuperAdminProtection(target, parsed.data) ? await transaction.adminUser.count({ where: { role: "SUPER_ADMIN", isActive: true } }) : 2;
      const updateError = adminUserUpdateError(session.user, target, parsed.data, activeSuperAdmins);
      if (updateError === "self") throw new SelfModificationError();
      if (updateError === "last-super-admin") throw new ProtectedSuperAdminError();
      const securityChanged = target.role !== parsed.data.role || target.isActive !== parsed.data.isActive || target.email !== parsed.data.email;
      await transaction.adminUser.update({ where: { id }, data: { ...parsed.data, ...(securityChanged ? { sessionVersion: { increment: 1 } } : {}) }, select: { id: true } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/admin/users"); revalidatePath(`/admin/users/${id}/edit`);
    redirect(`/admin/users/${id}/edit?saved=1`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof SelfModificationError) return failure(formData, "You cannot deactivate yourself or change your own role.");
    if (error instanceof ProtectedSuperAdminError) return failure(formData, "The last active Super Admin cannot be deactivated or demoted.");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure(formData, "Please correct the highlighted fields.", { email: ["A user with this email already exists."] });
    return failure(formData, "Unable to update user.");
  }
}

export async function resetAdminPasswordAction(id: string, _state: AdminUserFormState, formData: FormData): Promise<AdminUserFormState> {
  const session = await superAdminSession();
  if (!session || !isAdminUserId(id)) return failure(formData, "Unable to reset password.");
  const parsed = resetAdminPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return failure(formData, "Please correct the highlighted fields.", parsed.error.flatten().fieldErrors);
  try {
    const passwordHash = await hash(parsed.data.password, bcryptWorkFactor);
    await prisma.adminUser.update({ where: { id }, data: { passwordHash, sessionVersion: { increment: 1 } }, select: { id: true } });
    revalidatePath(`/admin/users/${id}/edit`);
    redirect(`/admin/users/${id}/edit?password=reset`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return failure(formData, "Unable to reset password.");
  }
}
