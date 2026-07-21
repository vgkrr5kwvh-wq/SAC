import { requireAdmin } from "@/lib/admin-session";
export default async function BlogAdminLayout({ children }: { children: React.ReactNode }) { await requireAdmin("manage_blog", "/admin/blog"); return children; }
