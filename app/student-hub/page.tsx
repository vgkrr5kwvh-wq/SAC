import type { Metadata } from "next";
import Link from "next/link";
import { IoCheckmarkCircleOutline, IoSparklesOutline } from "react-icons/io5";
import FeaturedTools from "./_components/featured-tools";
import { studentTools } from "@/lib/student-hub/registry";
import { buildStudentHubStructuredData } from "@/lib/student-hub/structured-data";

export const metadata: Metadata = {
  title: "Student Hub | Free Study Abroad Planning Tools",
  description: "Explore free study-abroad planning tools and practical guidance for university research, costs, scholarships, documents, and visa preparation.",
  alternates: { canonical: "/student-hub" },
  openGraph: {
    title: "Student Hub | Self Apply Center",
    description: "Free planning tools and guidance to help students prepare for studying abroad with greater clarity.",
    url: "/student-hub",
    images: [{ url: "/og.png", alt: "Self Apply Center Student Hub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Hub | Self Apply Center",
    description: "Free planning tools and guidance for students preparing to study abroad.",
    images: ["/og.png"],
  },
};

const hubBenefits = [
  "Discover suitable study options",
  "Estimate study-related costs",
  "Understand scholarship possibilities",
  "Prepare required documents",
  "Improve visa interview readiness",
];

const mockInterviewUrl = "https://mock.osom.technimus.com/";

export default function StudentHubPage() {
  const structuredData = buildStudentHubStructuredData(studentTools);

  return <main className="student-hub-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <section className="student-hub-intro">
      <div className="shell student-hub-intro-grid">
        <div>
          <span className="eyebrow">Student Hub</span>
          <h1>Plan Your Study Abroad Journey with Confidence</h1>
          <p>Use free planning tools and practical guidance to explore your options, organise important decisions, and prepare for the next stage of your international education journey.</p>
          <div className="button-row">
            <Link className="button primary" href="/student-hub/university-finder">Explore University Finder <span aria-hidden="true">→</span></Link>
            <a className="button secondary" href={mockInterviewUrl} target="_blank" rel="noopener noreferrer">AI Mock Visa Interview <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <aside className="student-hub-intro-card" aria-label="Student Hub planning areas">
          <span><IoSparklesOutline aria-hidden="true" /> Free student resources</span>
          <h2>One clear place to plan what comes next.</h2>
          <ul>{hubBenefits.slice(0, 4).map((benefit) => <li key={benefit}><IoCheckmarkCircleOutline aria-hidden="true" />{benefit}</li>)}</ul>
        </aside>
      </div>
    </section>

    <section className="section student-hub-tools" aria-labelledby="student-hub-tools-heading">
      <div className="shell">
        <div className="section-heading"><span className="eyebrow">Featured tools</span><h2 id="student-hub-tools-heading">Build your plan one decision at a time.</h2><p>The University Finder will be the first Student Hub tool to launch. Preview the planned resources and check back as new tools become available.</p></div>
        <FeaturedTools tools={studentTools} />
      </div>
    </section>

    <section className="section student-hub-mock" aria-labelledby="mock-interview-heading">
      <div className="shell student-hub-mock-grid">
        <div className="student-hub-mock-mark"><IoSparklesOutline aria-hidden="true" /><span>Available now</span></div>
        <div><span className="eyebrow">AI Mock Visa Interview</span><h2 id="mock-interview-heading">Practise before your visa interview.</h2><p>Use the external AI Mock Visa Interview platform to support your USA and UK visa interview preparation.</p></div>
        <a className="button primary" href={mockInterviewUrl} target="_blank" rel="noopener noreferrer">Try Free Mock Interview <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section className="section student-hub-benefits" aria-labelledby="student-hub-benefits-heading">
      <div className="shell student-hub-benefits-grid">
        <div><span className="eyebrow">How Student Hub helps</span><h2 id="student-hub-benefits-heading">Practical support for important study decisions.</h2><p>Each resource is designed to make one part of your planning process easier to understand and organise.</p></div>
        <ol>{hubBenefits.map((benefit, index) => <li key={benefit}><span>{String(index + 1).padStart(2, "0")}</span><strong>{benefit}</strong></li>)}</ol>
      </div>
    </section>

    <section className="student-hub-disclaimer" aria-labelledby="student-hub-disclaimer-heading"><div className="shell"><div><h2 id="student-hub-disclaimer-heading">Guidance, not a guarantee</h2><p>Student Hub tools provide general guidance and estimates based on the information available. Results do not guarantee university admission, scholarship awards, or visa approval. Requirements and decisions remain subject to institutions and relevant authorities.</p></div></div></section>

    <section className="section student-hub-final-cta"><div className="shell"><div><span className="eyebrow">Personalised guidance</span><h2>Want help turning your plan into clear next steps?</h2><p>Talk to Self Apply Center about your profile, preferred destination, budget, documents, or application timeline.</p></div><div className="button-row"><Link className="button primary" href="/contact">Contact a counsellor</Link><a className="button secondary" href="https://wa.me/9779761642336" target="_blank" rel="noopener noreferrer">Chat on WhatsApp <span aria-hidden="true">↗</span></a></div></div></section>
  </main>;
}
