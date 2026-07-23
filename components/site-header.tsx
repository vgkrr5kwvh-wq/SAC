"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["/", "Home"],
  ["/about", "About"],
  ["/services", "Services"],
  ["/destinations", "Destinations"],
  ["/student-hub", "Student Hub"],
  ["/blog", "Blogs"],
  ["/events", "Events"],
  ["/contact", "Contact"],
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="topbar">
        <div className="shell topbar-inner">
          <span>Star Mall, 2nd Floor, Putalisadak, Kathmandu</span>
          <div><a href="tel:+977014012581">01-4012581</a><a href="mailto:info@selfapplycenter.com">info@selfapplycenter.com</a></div>
        </div>
      </div>
      <header className="site-header">
        <nav className="nav-shell" aria-label="Main navigation">
          <Link className="brand" href="/" aria-label="Self Apply Center home" onClick={() => setOpen(false)}>
            <Image src="/sac-logo.png" alt="Self Apply Center" width={350} height={132} priority />
          </Link>
          <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen((value) => !value)}>
            <span /><span /><span /><span className="sr-only">Toggle navigation</span>
          </button>
          <div className={`nav-links${open ? " is-open" : ""}`} id="primary-nav">
            {links.map(([href, label]) => (
              <Link className={pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "is-active" : ""} href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>
            ))}
            <a className="nav-cta" href="https://sac.osom.global/1/student" target="_blank" rel="noopener noreferrer">Apply Now</a>
          </div>
        </nav>
      </header>
    </>
  );
}
