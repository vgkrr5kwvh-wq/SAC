import { requireAdmin } from "@/lib/admin-session";
export default async function EnquiriesAdminLayout({ children }: { children: React.ReactNode }) { await requireAdmin("manage_enquiries", "/admin/enquiries"); return children; }
