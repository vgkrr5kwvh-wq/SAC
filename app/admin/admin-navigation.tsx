"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  IoAlbumsOutline,
  IoBriefcaseOutline,
  IoCloseOutline,
  IoFolderOpenOutline,
  IoGridOutline,
  IoImagesOutline,
  IoLogOutOutline,
  IoMenuOutline,
  IoPeopleOutline,
  IoPersonCircleOutline,
  IoPricetagsOutline,
  IoSettingsOutline,
} from "react-icons/io5";
import { logoutAction } from "./actions";
import type { AdminRole } from "@prisma/client";
import { formatAdminRole, hasAdminPermission, type AdminPermission } from "@/lib/admin-authorization";

const items = [
  { href: "/admin", label: "Dashboard", exact: true, icon: IoGridOutline, permission: "view_dashboard" },
  { href: "/admin/enquiries", label: "Student Enquiries", icon: IoPeopleOutline, permission: "manage_enquiries" },
  { href: "/admin/partner-enquiries", label: "Partner Enquiries", icon: IoBriefcaseOutline, permission: "manage_enquiries" },
  { href: "/admin/blog", label: "Blog", exact: true, icon: IoAlbumsOutline, permission: "manage_blog" },
  { href: "/admin/blog/categories", label: "Categories", icon: IoPricetagsOutline, permission: "manage_categories" },
  { href: "/admin/media", label: "Media Library", icon: IoImagesOutline, permission: "manage_media" },
  { href: "/admin/users", label: "Users", icon: IoSettingsOutline, permission: "manage_users" },
  { href: "/admin/profile", label: "Profile", icon: IoPersonCircleOutline, permission: "manage_profile" },
] satisfies Array<{ href: string; label: string; exact?: boolean; icon: typeof IoGridOutline; permission: AdminPermission }>;

export default function AdminNavigation({ email, role }: { email: string; role: AdminRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return <>
    <button className="admin-mobile-menu" type="button" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen((value) => !value)}>
      {open ? <IoCloseOutline aria-hidden="true" /> : <IoMenuOutline aria-hidden="true" />}
      <span>{open ? "Close menu" : "Open menu"}</span>
    </button>
    {open ? <button className="admin-sidebar-scrim" type="button" aria-label="Close administration menu" onClick={() => setOpen(false)} /> : null}
    <aside className={`admin-sidebar${open ? " is-open" : ""}`} id="admin-sidebar">
      <Link className="admin-sidebar-brand" href="/admin" onClick={() => setOpen(false)}>
        <span className="admin-brand-mark"><IoFolderOpenOutline aria-hidden="true" /></span>
        <span><strong>Self Apply Center</strong><small>CMS</small></span>
      </Link>
      <nav className="admin-navigation" aria-label="Administration">
        <span className="admin-nav-label">Workspace</span>
        {items.filter((item) => hasAdminPermission(role, item.permission)).map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><Icon aria-hidden="true"/><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="admin-sidebar-account">
        <span className="admin-account-avatar">A</span>
        <span><strong>{formatAdminRole(role)}</strong><small>{email}</small></span>
      </div>
      <form action={logoutAction} className="admin-sidebar-logout">
        <button type="submit"><IoLogOutOutline aria-hidden="true"/>Logout</button>
      </form>
    </aside>
  </>;
}
