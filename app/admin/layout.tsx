import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logoutAction } from "./actions";
import AdminNavigation from "./admin-navigation";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <span>Self Apply Center</span>
          <strong>Administration</strong>
        </div>
        <form action={logoutAction}>
          <button className="button secondary admin-logout" type="submit">
            Log out
          </button>
        </form>
      </header>
      <AdminNavigation />
      <main className="admin-content">{children}</main>
    </div>
  );
}
