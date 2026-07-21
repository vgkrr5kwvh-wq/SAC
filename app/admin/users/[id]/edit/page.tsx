import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdminUserId } from "@/lib/admin-user-management";
import { prisma } from "@/lib/prisma";
import { AdminUserForm, ResetPasswordForm } from "../../user-form";

export default async function EditAdminUserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string; password?: string }> }) {
  const { id } = await params; if (!isAdminUserId(id)) notFound();
  const user = await prisma.adminUser.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, isActive: true } }); if (!user) notFound();
  const notice = await searchParams;
  return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Access control</span><h1>Edit user</h1><p>{user.email}</p></div><Link className="admin-back-link" href="/admin/users">Back to users</Link></header>{notice.created ? <p className="admin-profile-message is-success" role="status">User created.</p> : null}{notice.saved ? <p className="admin-profile-message is-success" role="status">User updated.</p> : null}{notice.password === "reset" ? <p className="admin-profile-message is-success" role="status">Password reset. Existing sessions have been invalidated.</p> : null}<div className="cms-user-edit-grid"><section className="admin-table-card"><div className="admin-table-heading"><h2>Account and role</h2></div><AdminUserForm id={user.id} initial={{ ...user, name: user.name ?? "Administrator" }}/></section><section className="admin-table-card"><div className="admin-table-heading"><div><span>Security</span><h2>Reset password</h2></div></div><ResetPasswordForm id={user.id}/></section></div></div>;
}
