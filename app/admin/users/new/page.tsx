import Link from "next/link";
import { AdminUserForm } from "../user-form";
export default function NewAdminUserPage() { return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Access control</span><h1>Add user</h1><p>Create a CMS account with the minimum required role.</p></div><Link className="admin-back-link" href="/admin/users">Back to users</Link></header><section className="admin-table-card"><div className="admin-table-heading"><h2>Account details</h2></div><AdminUserForm/></section></div>; }
