"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/enquiries", label: "Student enquiries" },
  { href: "/admin/partner-enquiries", label: "Partner enquiries" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/profile", label: "Profile" },
];

export default function AdminNavigation() {
  const pathname = usePathname();
  return <nav className="admin-navigation" aria-label="Administration">{items.map((item) => {
    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>{item.label}</Link>;
  })}</nav>;
}
