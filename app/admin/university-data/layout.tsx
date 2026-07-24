import { requireAdmin } from "@/lib/admin-session";

export default async function UniversityDataAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("manage_university_data", "/admin/university-data");
  return children;
}

