import Link from "next/link";

export default function StudentHubToolPlaceholder({ title, description }: { title: string; description: string }) {
  // TODO: Replace this shared placeholder when interactive tools are implemented.
  return <main><section className="inner-hero"><div className="shell inner-hero-grid"><div><span className="eyebrow">Student Hub</span><h1>{title}</h1><p>{description}</p></div><div className="breadcrumb"><Link href="/">Home</Link><span>→</span><Link href="/student-hub">Student Hub</Link><span>→</span><strong>{title}</strong></div></div></section><section className="section"><div className="shell"><article className="page-content-card"><span className="content-index">Soon</span><h2>This tool is coming soon.</h2><p>We are preparing this free resource for students planning their international education.</p><Link className="text-action" href="/student-hub">Explore Student Hub →</Link></article></div></section></main>;
}
