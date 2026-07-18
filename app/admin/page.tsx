import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  return (
    <section className="admin-welcome" aria-labelledby="admin-heading">
      <span className="login-eyebrow">Administrator dashboard</span>
      <h1 id="admin-heading">Self Apply Center Admin</h1>
      <p>Welcome. This secure area is ready for future administration tools.</p>
      <dl>
        <div>
          <dt>Signed in as</dt>
          <dd>{session.user.email}</dd>
        </div>
      </dl>
    </section>
  );
}
