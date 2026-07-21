import type { AdminRole } from "@prisma/client";

export type AdminPermission =
  | "view_dashboard"
  | "manage_enquiries"
  | "manage_blog"
  | "publish_blog"
  | "manage_categories"
  | "manage_media"
  | "delete_media"
  | "manage_users"
  | "manage_settings"
  | "manage_profile";

const permissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMIN: new Set(["view_dashboard", "manage_enquiries", "manage_blog", "publish_blog", "manage_categories", "manage_media", "delete_media", "manage_users", "manage_settings", "manage_profile"]),
  EDITOR: new Set(["view_dashboard", "manage_blog", "publish_blog", "manage_categories", "manage_media", "delete_media", "manage_profile"]),
  STAFF: new Set(["view_dashboard", "manage_enquiries", "manage_profile"]),
};

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  return permissions[role].has(permission);
}

export function isAdminRole(value: unknown): value is AdminRole {
  return value === "SUPER_ADMIN" || value === "EDITOR" || value === "STAFF";
}

export function formatAdminRole(role: AdminRole): string {
  return role.split("_").map((part) => part[0] + part.slice(1).toLowerCase()).join(" ");
}

export function canChangeAdminRole(actor: { id: string; role: AdminRole }, target: { id: string; role: AdminRole }, nextRole: AdminRole): boolean {
  return actor.role === "SUPER_ADMIN" && (actor.id !== target.id || nextRole === target.role);
}

export function requiresLastSuperAdminProtection(target: { role: AdminRole; isActive: boolean }, next: { role: AdminRole; isActive: boolean }): boolean {
  return target.role === "SUPER_ADMIN" && target.isActive && (!next.isActive || next.role !== "SUPER_ADMIN");
}

export function adminUserUpdateError(
  actor: { id: string; role: AdminRole },
  target: { id: string; role: AdminRole; isActive: boolean },
  next: { role: AdminRole; isActive: boolean },
  activeSuperAdminCount: number,
): string | null {
  if (!canChangeAdminRole(actor, target, next.role) || (actor.id === target.id && !next.isActive)) return "self";
  if (requiresLastSuperAdminProtection(target, next) && activeSuperAdminCount <= 1) return "last-super-admin";
  return null;
}

export function isCurrentAdminSession(account: { isActive: boolean; sessionVersion: number } | null, tokenVersion: unknown): boolean {
  return Boolean(account?.isActive && typeof tokenVersion === "number" && account.sessionVersion === tokenVersion);
}
