import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import {
  formatAdminAccountStatus,
  formatAdminProfileDate,
} from "@/lib/admin-profile";
import { prisma } from "@/lib/prisma";
import PasswordChangeForm from "./password-change-form";

export const metadata: Metadata = {
  title: "Administrator profile",
  robots: { index: false, follow: false },
};

export default async function AdminProfilePage() {
  const session = await auth();

  let administrator;
  try {
    if (!session?.user.id) throw new Error("Unauthenticated profile request");

    administrator = await prisma.adminUser.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch {
    return (
      <section className="admin-error" role="alert">
        <h1>Unable to load administrator profile.</h1>
      </section>
    );
  }

  if (!administrator) {
    return (
      <section className="admin-error" role="alert">
        <h1>Unable to load administrator profile.</h1>
      </section>
    );
  }

  return (
    <div className="admin-profile-page">
      <header className="admin-dashboard-heading">
        <div>
          <span className="login-eyebrow">Administrator profile</span>
          <h1>Profile</h1>
          <p>View your administrator account and update its password.</p>
        </div>
      </header>

      <div className="admin-profile-grid">
        <section
          className="admin-profile-card"
          aria-labelledby="administrator-information-heading"
        >
          <h2 id="administrator-information-heading">
            Administrator Information
          </h2>
          <dl className="admin-profile-account">
            <div>
              <dt>Email</dt>
              <dd>{administrator.email}</dd>
            </div>
            <div>
              <dt>Account Status</dt>
              <dd>{formatAdminAccountStatus(administrator.isActive)}</dd>
            </div>
          </dl>
        </section>

        <section
          className="admin-profile-card"
          aria-labelledby="account-information-heading"
        >
          <h2 id="account-information-heading">Account Information</h2>
          <dl className="admin-profile-account">
            <div>
              <dt>Account Created</dt>
              <dd className="admin-profile-date">
                {formatAdminProfileDate(administrator.createdAt)}
              </dd>
            </div>
            <div>
              <dt>Last Updated</dt>
              <dd className="admin-profile-date">
                {formatAdminProfileDate(administrator.updatedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section
        id="change-password"
        className="admin-profile-card"
        aria-labelledby="security-heading"
      >
        <h2 id="security-heading">Security</h2>
        <h3 className="admin-profile-subheading">Change Password</h3>
        <PasswordChangeForm />
      </section>

      <section className="admin-profile-card" aria-labelledby="profile-actions-heading">
        <h2 id="profile-actions-heading">Actions</h2>
        <Link className="button secondary admin-profile-action" href="#change-password">
          Change Password
        </Link>
      </section>
    </div>
  );
}
