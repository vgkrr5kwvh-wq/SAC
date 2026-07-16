import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogIndex from "../../components/blog-index";
import PartnerForm from "../../components/partner-form";
import { sitePages } from "../site-data";

export function generateStaticParams() {
  return Object.keys(sitePages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = sitePages[slug];
  return page ? { title: page.eyebrow, description: page.description } : {};
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = sitePages[slug];
  if (!page) notFound();

  const isContact = slug === "contact";
  const isBlog = slug === "blog";
  const isPartner = slug === "partner-with-us";

  return (
    <main>
      <section className="inner-hero">
        <div className="shell inner-hero-grid">
          <div><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div>
          <div className="breadcrumb"><Link href="/">Home</Link><span>→</span><strong>{page.eyebrow}</strong></div>
        </div>
      </section>
      {isBlog ? <BlogIndex /> : <section className="section">
        <div className={`shell content-page-grid${page.sections.length > 4 ? " wide" : ""}`}>
          {page.sections.map((section, index) => (
            <article className="page-content-card" key={section.title}>
              <span className="content-index">{String(index + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              <p>{section.copy}</p>
              {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
              {isContact && index === 0 && <a className="text-action" href="https://www.google.com/maps/search/?api=1&query=Star%20Mall%2C%202nd%20Floor%2C%20Putalisadak%2C%20Kathmandu" target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>}
              {isContact && index === 1 && <a className="text-action" href="https://wa.me/9779761642336" target="_blank" rel="noopener noreferrer">Message on WhatsApp →</a>}
              {isContact && index === 2 && <a className="text-action" href="mailto:info@selfapplycenter.com">Send an email →</a>}
            </article>
          ))}
        </div>
      </section>}
      {isPartner && <PartnerForm />}
      <section className="faq-section">
        <div className="shell faq-grid">
          <div><span className="eyebrow">Common questions</span><h2>About {page.eyebrow.toLowerCase()}</h2><p>Helpful answers related specifically to this page.</p></div>
          <div>
            {page.faqs.map((faq) => (
              <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
