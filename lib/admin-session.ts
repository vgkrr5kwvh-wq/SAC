import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasAdminPermission, type AdminPermission } from "@/lib/admin-authorization";

export async function requireAdmin(permission?: AdminPermission, callbackUrl = "/admin") {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (permission && !hasAdminPermission(session.user.role, permission)) redirect("/admin/forbidden");
  return session;
}
