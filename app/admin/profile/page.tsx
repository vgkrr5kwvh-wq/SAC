import type { Metadata } from "next";
import { auth } from "@/auth";
import PasswordChangeForm from "./password-change-form";

export const metadata: Metadata = {
  title: "Administrator profile",
  robots: { index: false, follow: false },
};

export default async function AdminProfilePage() {
  const session = await auth();

  return (
    <div className="admin-profile-page">
      <header className="admin-dashboard-heading">
        <div>
          <span className="login-eyebrow">Administrator profile</span>
          <h1>Profile</h1>
          <p>View your administrator account and update its password.</p>
        </div>
      </header>

      <section className="admin-profile-card" aria-labelledby="administrator-account-heading">
        <h2 id="administrator-account-heading">Administrator Account</h2>
        <dl className="admin-profile-account">
          <div>
            <dt>Email address</dt>
            <dd>{session?.user.email}</dd>
          </div>
        </dl>
      </section>

      <section className="admin-profile-card" aria-labelledby="change-password-heading">
        <h2 id="change-password-heading">Change Password</h2>
        <PasswordChangeForm />
      </section>
    </div>
  );
}
