import type { Metadata } from "next";
import Link from "next/link";
import { sitePages } from "@/app/site-data";

const description = "Read how Self Apply Center handles enquiries, website security information, and privacy-conscious first-party blog readership analytics.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description,
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
};

function contactDetail(title: string): string {
  return sitePages.contact.sections.find((section) => section.title === title)?.copy ?? "";
}

export default function PrivacyPolicyPage() {
  const email = contactDetail("Email");
  const office = contactDetail("Visit our office");

  return (
    <main>
      <section className="inner-hero">
        <div className="shell inner-hero-grid">
          <div><span className="eyebrow">Privacy Policy</span><h1>How we handle information on this website.</h1><p>This operational notice explains the information used to provide, secure, and understand Self Apply Center’s website services.</p></div>
          <div className="breadcrumb"><Link href="/">Home</Link><span>→</span><strong>Privacy Policy</strong></div>
        </div>
      </section>

      <section className="section privacy-policy">
        <div className="shell privacy-policy-content">
          <p className="privacy-policy-intro">This notice describes current website operations and the first-party blog analytics planned for deployment. It does not claim compliance with a particular law or replace professional legal advice.</p>

          <section>
            <h2>Information you choose to provide</h2>
            <p>When you submit a student enquiry or contact form, we receive the details you enter, such as your name, email address, study interest, and message. If you submit a partnership enquiry, we receive the contact, organisation, location, proposal, and other information entered in that form.</p>
            <p>We use these details to review and respond to the relevant enquiry, maintain an administrative record, and deliver related notifications. Please provide only information relevant to your request.</p>
          </section>

          <section>
            <h2>Website operation and security</h2>
            <p>The website processes ordinary request information needed to deliver pages, prevent abuse, and protect forms. For enquiry rate limiting, the application may create and store a one-way hash derived from request information; the application does not store the raw IP address in the enquiry record.</p>
            <p>Hosting, email-delivery, media-hosting, authentication, and other service providers may process information only where their services are used to operate the website. The site does not use Google Analytics, gtag, or a third-party readership analytics SDK for blog measurement.</p>
          </section>

          <section>
            <h2>Blog readership analytics</h2>
            <p>Once enabled, Self Apply Center will use first-party analytics on published blog articles to understand readership and improve useful content. A first-party cookie may distinguish an estimated browser for up to one year. Its browser identifier is random and pseudonymous.</p>
            <p>The raw browser identifier is not persisted in the analytics database. Only HMAC-derived identifiers are stored. Raw IP addresses and full user-agent strings are not persisted for blog analytics.</p>
            <p>The analytics record may include the article viewed, view and update timestamps, bounded engaged reading time, maximum reading depth, and whether an approximate completion threshold was reached.</p>
            <p>“Estimated unique browsers” does not mean uniquely identified people. Multiple devices, clearing cookies, private browsing, blocked cookies, and shared devices can change the estimate. Visitors can remove the analytics identifier by clearing cookies for this site.</p>
            <p>Tracking starts only after analytics is deployed. Historical readership is not invented or backfilled. Permanently deleting a blog post also deletes its raw article analytics.</p>
            <p>The target retention period for raw article analytics is 180 days. Retention automation will be required before the first 180-day deadline. Aggregate or non-identifying reporting may later be retained for longer.</p>
          </section>

          <section>
            <h2>Administrative activity</h2>
            <p>Authenticated CMS and administrative activity is excluded from blog readership analytics where the system can identify the administrator session.</p>
          </section>

          <section>
            <h2>Data security</h2>
            <p>Self Apply Center uses reasonable technical and organisational safeguards appropriate to the website and the information it handles. No internet service or storage system can be guaranteed completely secure.</p>
          </section>

          <section>
            <h2>Contact us</h2>
            <p>Questions about this notice can be sent to <a href={`mailto:${email}`}>{email}</a>. You can also contact Self Apply Center through the <Link href="/contact">contact page</Link> or visit {office}.</p>
          </section>

          <section>
            <h2>Policy updates</h2>
            <p>We may update this notice as the website’s features and information-handling practices change. The current version will remain available on this page.</p>
          </section>
        </div>
      </section>
    </main>
  );
}
