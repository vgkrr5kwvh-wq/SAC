import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import SiteChrome from "../components/site-chrome";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://selfapplycenter.com"),
  title: {
    default: "Self Apply Center | Apply Abroad with Clarity",
    template: "%s | Self Apply Center",
  },
  description:
    "Self Apply Center helps students apply abroad with transparent guidance, document review, destination planning, and application tracking.",
  icons: {
    icon: "/sac-logo.png",
    shortcut: "/sac-logo.png",
  },
  openGraph: {
    title: "Self Apply Center",
    description: "Apply abroad yourself, with experts beside you.",
    images: [{ url: "/og.png", width: 1734, height: 907, alt: "Self Apply Center guided study-abroad application support" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Self Apply Center",
    description: "Apply abroad yourself, with experts beside you.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${plusJakartaSans.variable}`}>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
