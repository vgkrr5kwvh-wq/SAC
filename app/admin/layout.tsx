import { logoutAction } from "./actions";
import AdminNavigation from "./admin-navigation";
import Link from "next/link";
import { IoLogOutOutline, IoPersonCircleOutline } from "react-icons/io5";
import { formatAdminRole } from "@/lib/admin-authorization";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdmin("view_dashboard");

  return (
    <div className="admin-shell">
      <AdminNavigation email={session.user.email ?? "Administrator"} role={session.user.role} />
      <div className="admin-workspace">
        <header className="admin-header">
          <div className="admin-header-context">
            <strong className="admin-header-product">Self Apply Center CMS</strong>
            <div className="admin-header-identity">
              <span>Logged in as</span>
              <strong>{formatAdminRole(session.user.role)}</strong>
              <small>{session.user.email}</small>
            </div>
          </div>
          <div className="admin-header-actions">
            <Link href="/admin/profile">
              <IoPersonCircleOutline aria-hidden="true" />
              Profile
            </Link>
            <form action={logoutAction}>
              <button className="admin-header-logout" type="submit">
                <IoLogOutOutline aria-hidden="true" />
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
