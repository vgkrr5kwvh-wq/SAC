import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PartnerForm from "../../components/partner-form";
import { sitePages } from "../site-data";

const pageVisuals: Record<string, string[]> = {
  about: ["https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=82", "/about-sac-difference.jpg", "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=82"],
  "our-team": ["https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=82"],
  services: ["https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=82"],
  destinations: ["https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1000&q=82"],
  "success-stories": ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1000&q=82"],
  events: ["https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=82", "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1000&q=82"],
};

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
  const isPartner = slug === "partner-with-us";
  const visuals = pageVisuals[slug];

  return (
    <main>
      <section className="inner-hero">
        <div className="shell inner-hero-grid">
          <div><span className="eyebrow">{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div>
          <div className="breadcrumb"><Link href="/">Home</Link><span>→</span><strong>{page.eyebrow}</strong></div>
        </div>
      </section>
      <section className="section">
        <div className={`shell content-page-grid${page.sections.length > 4 ? " wide" : ""}`}>
          {page.sections.map((section, index) => (
            <article className={`page-content-card${visuals ? " has-media" : ""}`} key={section.title}>
              {visuals && <div className="page-card-media"><Image src={visuals[index % visuals.length]} alt="" fill sizes="(max-width: 680px) 100vw, (max-width: 1020px) 50vw, 390px" unoptimized /></div>}
              <div className="page-card-copy">
              <span className="content-index">{String(index + 1).padStart(2, "0")}</span>
              <h2>{section.title}</h2>
              {isContact && index === 1 ? (
                <p>
                  Office: 01-4012581 · WhatsApp:{" "}
                  <a href="https://wa.me/9779761642348" target="_blank" rel="noopener noreferrer">9761642348</a>
                  {" | "}
                  <a href="https://wa.me/9779761642349" target="_blank" rel="noopener noreferrer">9761642349</a>
                  {" | "}
                  <a href="https://wa.me/9779761642336" target="_blank" rel="noopener noreferrer">9761642336</a>
                </p>
              ) : (
                <p>{section.copy}</p>
              )}
              {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
              {isContact && index === 0 && <a className="text-action" href="https://www.google.com/maps/search/?api=1&query=Star%20Mall%2C%202nd%20Floor%2C%20Putalisadak%2C%20Kathmandu" target="_blank" rel="noopener noreferrer">Open in Google Maps →</a>}
              {isContact && index === 2 && <a className="text-action" href="mailto:info@selfapplycenter.com">Send an email →</a>}
              </div>
            </article>
          ))}
        </div>
      </section>
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
