"use client";

import { usePathname } from "next/navigation";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import SiteMotion from "./site-motion";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) return children;

  return (
    <>
      <SiteHeader />
      <SiteMotion />
      {children}
      <SiteFooter />
    </>
  );
}
