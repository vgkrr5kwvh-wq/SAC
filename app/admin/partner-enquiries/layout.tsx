import { requireAdmin } from "@/lib/admin-session";
export default async function PartnerEnquiriesAdminLayout({ children }: { children: React.ReactNode }) { await requireAdmin("manage_enquiries", "/admin/partner-enquiries"); return children; }
