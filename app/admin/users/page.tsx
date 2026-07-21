import Link from "next/link";
import { formatAdminRole } from "@/lib/admin-authorization";
import { formatAnalyticsDate } from "@/lib/admin-dashboard-analytics";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  let users;
  try { users = await prisma.adminUser.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "asc" }, { id: "asc" }], select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { createdPosts: true, mediaAssets: true } } } }); }
  catch { return <section className="admin-error" role="alert"><h1>Unable to load users</h1></section>; }
  return <div className="admin-enquiries-page"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Access control</span><h1>Users</h1><p>Manage CMS access, roles, and account status.</p></div><Link className="button primary" href="/admin/users/new">Add user</Link></header><section className="admin-table-card"><div className="admin-table-heading"><div><span>CMS accounts</span><h2>Administrators</h2></div><small>{users.length} user{users.length === 1 ? "" : "s"}</small></div><div className="admin-table-scroll"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Content</th><th>Created</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name ?? "Administrator"}</strong><small className="cms-user-email">{user.email}</small></td><td><span className={`cms-role-badge is-${user.role.toLowerCase()}`}>{formatAdminRole(user.role)}</span></td><td><span className={`cms-status ${user.isActive ? "is-sent" : "is-failed"}`}>{user.isActive ? "Active" : "Inactive"}</span></td><td>{user._count.createdPosts} posts · {user._count.mediaAssets} media</td><td>{formatAnalyticsDate(user.createdAt)}</td><td className="admin-table-action"><Link href={`/admin/users/${user.id}/edit`}>Edit</Link></td></tr>)}</tbody></table></div></section></div>;
}
