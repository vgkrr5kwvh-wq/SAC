import type { Metadata } from "next";
import Link from "next/link";
import UniversityFinder from "./university-finder";

export const metadata: Metadata = {
  title: "University Match Finder",
  description: "Prepare your study preferences and academic profile with the Self Apply Center University Match Finder questionnaire.",
  alternates: { canonical: "/student-hub/university-finder" },
};

export default function UniversityFinderPage() {
  return <main className="student-finder-page">
    <section className="inner-hero"><div className="shell inner-hero-grid"><div><span className="eyebrow">Student Hub · University Finder</span><h1>Build your university search profile.</h1><p>Answer four short sections about your study plans, academic background, English preparation, and preferences.</p></div><div className="breadcrumb"><Link href="/">Home</Link><span>→</span><Link href="/student-hub">Student Hub</Link><span>→</span><strong>University Finder</strong></div></div></section>
    <section className="section student-finder-section"><div className="shell"><div className="student-finder-demo-notice" role="note"><strong>Questionnaire preview</strong><p>The matching engine is not active yet. This form does not assess eligibility or generate university recommendations.</p></div><UniversityFinder /></div></section>
    <section className="student-finder-disclaimer"><div className="shell"><h2>Educational guidance only</h2><p>Future University Finder results will provide general guidance based on available catalog information. They will not guarantee admission, scholarships, visa approval, or enrollment. Requirements may change and should be verified with each institution and a qualified counsellor.</p></div></section>
  </main>;
}
