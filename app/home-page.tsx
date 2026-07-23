"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

const applyUrl = "https://sac.osom.global/1/student";

const services = [
  ["01", "Course & University Mapping", "Build a realistic shortlist around your academics, budget, career goals, intake, and preferred countries.", "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85"],
  ["02", "Document & Story Review", "Strengthen your SOP, CV, academic files, financial documents, and application details before submission.", "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=1200&q=85"],
  ["03", "Application Roadmap Tracking", "See what is pending, ready, submitted, and what needs your attention next.", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85"],
  ["04", "Offer, Visa & Enrollment Prep", "Move from offer letter to visa and enrollment with organized checklists and practical counselling.", "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=85"],
];

const journey = [
  ["01", "Profile check", "Review academics, budget, preferred countries, intake timing, and possible risks."],
  ["02", "Course shortlist", "Compare programs by entry requirements, career fit, affordability, and outcomes."],
  ["03", "Document review", "Prepare SOP, CV, academic files, financial papers, and application-ready evidence."],
  ["04", "Application submit", "Track forms, deadlines, pending files, communication, and university responses."],
  ["05", "Offer & visa prep", "Plan offer conditions, enrollment tasks, visa documents, and arrival readiness."],
];

const destinations = [
  ["USA", "Flexible study routes", "Profile-first guidance across universities, courses, and budgets.", "https://images.unsplash.com/photo-1485738422979-f5c462d49f74?auto=format&fit=crop&w=1200&q=85"],
  ["Canada", "Practical program planning", "Compare course relevance, affordability, and intake requirements.", "https://images.unsplash.com/photo-1517935706615-2717063c2225?auto=format&fit=crop&w=1200&q=85"],
  ["UK", "Clear intake decisions", "Understand entry requirements, timelines, and document expectations.", "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=85"],
  ["South Korea", "Emerging pathways", "Explore language, scholarship, and degree opportunities with context.", "https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1200&q=85"],
];

const testimonials = [
  ["Aashish Dhakal", "Graduate Instructional Assistant", "The team understood my situation, answered my questions patiently, and made the visa process feel manageable.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80"],
  ["Rohit Bohora", "USA visa approved", "From selecting the right program to visa guidance, SAC supported me at every step. The interview classes boosted my confidence.", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=80"],
  ["Kanchan Poudel", "Canada visa approved", "SAC made my dream of studying in Canada a reality with counselling, application support, and visa appointment guidance.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80"],
];

export default function HomePage() {
  const [formState, setFormState] = useState<{
    status: "idle" | "submitting" | "success" | "validation-error" | "server-error";
    message: string;
  }>({ status: "idle", message: "Submit the form and our team will receive your enquiry securely." });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFormState({ status: "submitting", message: "Sending your enquiry…" });

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("Name"),
          email: data.get("Email"),
          interest: data.get("Interest"),
          message: data.get("Message"),
          website: data.get("website"),
        }),
      });
      const result = await response.json().catch(() => null) as {
        message?: string;
        fieldErrors?: Record<string, string[]>;
      } | null;

      if (!response.ok) {
        const fieldMessage = result?.fieldErrors
          ? Object.values(result.fieldErrors).flat().find(Boolean)
          : undefined;
        setFormState({
          status: response.status === 400 ? "validation-error" : "server-error",
          message: fieldMessage ?? result?.message ?? "We could not send your enquiry. Please try again.",
        });
        return;
      }

      form.reset();
      setFormState({ status: "success", message: result?.message ?? "Thank you. Your enquiry has been received." });
    } catch {
      setFormState({ status: "server-error", message: "We could not send your enquiry. Please check your connection and try again." });
    }
  }

  return (
    <>
      <main id="top">
        <section className="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">Guided self-application platform</span>
              <h1>Apply abroad yourself, with experts beside you.</h1>
              <p>
                Take ownership of your university application with a clear plan,
                document review, destination guidance, and transparent step-by-step support.
              </p>
              <div className="button-row">
                <a className="button primary" href={applyUrl} target="_blank" rel="noopener noreferrer">Start your application</a>
                <a className="button secondary" href="#destinations">Explore destinations</a>
              </div>
              <dl className="hero-metrics">
                <div><dt>Self-led</dt><dd>Student-first process</dd></div>
                <div><dt>Reviewed</dt><dd>Documents checked</dd></div>
                <div><dt>Tracked</dt><dd>Every next step</dd></div>
              </dl>
            </div>
            <div className="hero-media">
              <div className="image-frame">
                <Image
                  src="/self-apply-center-hero.png"
                  alt="Student application documents and global study planning"
                  width={1717}
                  height={916}
                  priority
                />
              </div>
              <div className="status-card"><span className="status-dot" /><div><strong>Profile mapped</strong><small>Next actions ready</small></div></div>
              <div className="readiness-card"><strong>92%</strong><span>Application readiness</span></div>
            </div>
          </div>
        </section>

        <section className="trust-bar" aria-label="Platform benefits">
          <div className="shell trust-grid">
            <span>Student-owned applications</span>
            <span>Honest destination advice</span>
            <span>Submission-ready documents</span>
            <span>Clear timelines & checklists</span>
          </div>
        </section>

        <section className="section" id="services">
          <div className="shell">
            <div className="section-heading">
              <span className="eyebrow">What SAC helps you do</span>
              <h2>A consultancy for students who do not want to feel dependent.</h2>
              <p>We make the process visible, explain every recommendation, and help you move confidently from shortlist to enrollment.</p>
            </div>
            <div className="card-grid">
              {services.map(([number, title, copy, image]) => (
                <article className="service-card" key={number}>
                  <div className="service-image">
                    <Image src={image} alt="" fill sizes="(max-width: 680px) 100vw, (max-width: 1180px) 50vw, 580px" unoptimized />
                    <span className="card-number">{number}</span>
                  </div>
                  <div className="service-card-copy">
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <div className="shell split-grid">
            <div className="roadmap-visual" aria-label="A clear application roadmap">
              <Image className="roadmap-photo" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=85" alt="Students planning their international education together" fill sizes="(max-width: 1020px) 100vw, 540px" unoptimized />
              <div className="roadmap-shade" />
              <div className="roadmap-card">
                <span>YOUR APPLICATION PLAN</span>
                <h3>Clear next steps</h3>
                {["Profile reviewed", "Shortlist confirmed", "Documents prepared", "Application tracked"].map((item, index) => (
                  <div className="check-row" key={item}><b>0{index + 1}</b><span>{item}</span><i>✓</i></div>
                ))}
              </div>
            </div>
            <div>
              <span className="eyebrow">Why choose Self Apply Center</span>
              <h2>Built for students who want clarity, not pressure.</h2>
              <p className="lead">SAC brings structure to scattered information and unclear requirements, so you stay in control while getting professional guidance where it matters.</p>
              <div className="value-list">
                <div><h3>Ownership without overwhelm</h3><p>Understand your options before committing to a country, course, or university.</p></div>
                <div><h3>No black-box processing</h3><p>See what is prepared, reviewed, submitted, pending, and ready for action.</p></div>
                <div><h3>Guidance with reasons</h3><p>Get recommendations explained in plain language, not pushed as one-size-fits-all advice.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="journey">
          <div className="shell">
            <div className="section-heading">
              <span className="eyebrow">Student journey</span>
              <h2>From a confusing application to a clear sequence.</h2>
            </div>
            <div className="journey-grid">
              {journey.map(([number, title, copy]) => (
                <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section className="section destinations-section" id="destinations">
          <div className="shell">
            <div className="section-heading light">
              <span className="eyebrow">Courses & destinations</span>
              <h2>Focused pathways for your next chapter.</h2>
              <p>Start with your profile and future goals, then choose the country and course that fit.</p>
            </div>
            <div className="destination-grid">
              {destinations.map(([title, subtitle, copy, image]) => (
                <article key={title}>
                  <Image src={image} alt={`${title} study destination`} fill sizes="(max-width: 680px) 100vw, (max-width: 1020px) 50vw, 295px" unoptimized />
                  <div className="destination-overlay" />
                  <div className="destination-copy">
                    <span className="country-code">{title.slice(0, 2)}</span>
                    <h3>{title}</h3>
                    <strong>{subtitle}</strong>
                    <p>{copy}</p>
                    <a href="#contact">Discuss this route <span>→</span></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section stories-section" id="stories">
          <div className="shell">
            <div className="section-heading">
              <span className="eyebrow">Student experiences</span>
              <h2>Trust built through clear, practical support.</h2>
            </div>
            <div className="story-grid">
              {testimonials.map(([name, result, quote, image]) => (
                <blockquote key={name}><span className="quote-mark">“</span><p>{quote}</p><footer><Image src={image} alt="" width={52} height={52} unoptimized /><span><strong>{name}</strong><small>{result}</small></span></footer></blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="section contact-section" id="contact">
          <div className="shell contact-grid">
            <div>
              <span className="eyebrow">Talk to SAC</span>
              <h2>Tell us your study goal. We’ll map the next step.</h2>
              <p className="lead">Share your preferred destination, course interest, or current concern. We will help you understand what is realistic and what to do next.</p>
              <div className="contact-details">
                <a href="mailto:info@selfapplycenter.com"><span>Email</span><strong>info@selfapplycenter.com</strong></a>
                <a href="tel:+977014012581"><span>Office</span><strong>01-4012581</strong></a>
                <div>
                  <span>WhatsApp</span>
                  <strong>
                    <a href="https://wa.me/9779761642348" target="_blank" rel="noopener noreferrer">9761642348</a>
                    {" | "}
                    <a href="https://wa.me/9779761642349" target="_blank" rel="noopener noreferrer">9761642349</a>
                    {" | "}
                    <a href="https://wa.me/9779761642336" target="_blank" rel="noopener noreferrer">9761642336</a>
                  </strong>
                </div>
                <div><span>Visit</span><strong>Star Mall, 2nd Floor, Putalisadak, Kathmandu</strong></div>
              </div>
            </div>
            <form className="contact-form" onSubmit={handleSubmit}>
              <label className="form-honeypot" aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
              <label>Full name<input name="Name" type="text" placeholder="Your full name" required autoComplete="name" /></label>
              <label>Email address<input name="Email" type="email" placeholder="you@example.com" required autoComplete="email" /></label>
              <label>Destination or course<input name="Interest" type="text" placeholder="Canada, Business Analytics" /></label>
              <label>How can we help?<textarea name="Message" rows={4} placeholder="Tell us where you want to study and what support you need." required /></label>
              <button className="button primary" type="submit" disabled={formState.status === "submitting"}>{formState.status === "submitting" ? "Sending enquiry…" : "Send enquiry"} <span>→</span></button>
              <p className="form-message" role="status" aria-live="polite">{formState.message}</p>
            </form>
          </div>
        </section>

        <section className="location-section" aria-labelledby="location-heading">
          <div className="shell location-heading">
            <div>
              <span className="eyebrow">Visit our Kathmandu office</span>
              <h2 id="location-heading">Meet your counsellor in Putalisadak.</h2>
            </div>
            <p>Star Mall, 2nd Floor, Putalisadak, Kathmandu · Sunday–Friday, 9:30 AM–5:30 PM</p>
          </div>
          <div className="map-frame">
            <iframe
              title="Self Apply Center office location"
              src="https://www.google.com/maps?q=Star%20Mall%20Putalisadak%20Kathmandu&output=embed"
              width="100%"
              height="480"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>
      </main>

    </>
  );
}
