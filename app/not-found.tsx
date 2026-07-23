import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

const helpfulLinks = [
  { href: "/destinations", label: "Study in USA" },
  { href: "/destinations", label: "Study in Canada" },
  { href: "/destinations", label: "Study in UK" },
  { href: "https://sac.osom.global/1/student", label: "Student Hub", external: true },
  { href: "/contact", label: "Contact" },
];

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="shell not-found-shell" aria-labelledby="not-found-title">
        <div className="not-found-copy">
          <span className="eyebrow">Something went off course</span>
          <p className="not-found-code" aria-hidden="true">404</p>
          <h1 id="not-found-title">Page Not Found</h1>
          <p className="not-found-message">
            The page you&apos;re looking for may have been moved, renamed, or no longer exists.
          </p>
          <div className="not-found-actions">
            <Link className="button primary" href="/">Return Home</Link>
            <a
              className="button secondary"
              href="https://sac.osom.global/1/student"
              target="_blank"
              rel="noopener noreferrer"
            >
              Start Your Application
            </a>
          </div>
          <Link className="not-found-contact" href="/contact">Contact Us</Link>
        </div>

        <div className="not-found-visual" aria-hidden="true">
          <svg viewBox="0 0 560 420" role="img">
            <defs>
              <linearGradient id="not-found-sky" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#eaf7ff" />
                <stop offset="1" stopColor="#c7eaff" />
              </linearGradient>
              <linearGradient id="not-found-path" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#63baf3" />
                <stop offset="1" stopColor="#0284e8" />
              </linearGradient>
            </defs>
            <rect x="24" y="24" width="512" height="372" rx="42" fill="url(#not-found-sky)" />
            <circle cx="436" cy="104" r="34" fill="#fff" opacity=".8" />
            <path d="M74 334c75-42 123-40 176-7 62 39 126 28 236-31v66H74Z" fill="#fff" />
            <path d="M288 353c-8-78 27-126 105-153" fill="none" stroke="url(#not-found-path)" strokeWidth="18" strokeLinecap="round" />
            <path d="m374 153 67 19-54 44Z" fill="#0c79d8" />
            <path d="m390 172 23 7-19 15Z" fill="#fff" />
            <path d="M124 134h128v102H124z" fill="#fff" rx="10" />
            <path d="M112 134 188 79l76 55Z" fill="#0c79d8" />
            <path d="M145 163h31v31h-31zm55 0h31v31h-31z" fill="#a8ddff" />
            <path d="M177 205h24v31h-24z" fill="#63baf3" />
            <path d="M105 245h166" stroke="#0c79d8" strokeWidth="10" strokeLinecap="round" />
            <circle cx="112" cy="292" r="12" fill="#0c79d8" />
            <circle cx="145" cy="292" r="12" fill="#63baf3" />
            <circle cx="178" cy="292" r="12" fill="#0c79d8" />
          </svg>
        </div>

        <nav className="not-found-helpful" aria-label="Helpful links">
          <h2>You may be looking for</h2>
          <div>
            {helpfulLinks.map((link) => (
              link.external ? (
                <a href={link.href} key={link.label} target="_blank" rel="noopener noreferrer">
                  {link.label}<span aria-hidden="true">↗</span>
                </a>
              ) : (
                <Link href={link.href} key={link.label}>
                  {link.label}<span aria-hidden="true">→</span>
                </Link>
              )
            ))}
          </div>
        </nav>
      </section>
    </main>
  );
}
