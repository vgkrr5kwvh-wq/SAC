import { requireAdmin } from "@/lib/admin-session";
export default async function UsersAdminLayout({ children }: { children: React.ReactNode }) { await requireAdmin("manage_users", "/admin/users"); return children; }
