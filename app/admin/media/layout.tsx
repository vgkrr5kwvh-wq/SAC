import { requireAdmin } from "@/lib/admin-session";
export default async function MediaAdminLayout({ children }: { children: React.ReactNode }) { await requireAdmin("manage_media", "/admin/media"); return children; }
