import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UniversityDataPage() {
  const [universities, draftUniversities, stagedRecords, jobs] = await Promise.all([
    prisma.university.count(),
    prisma.university.count({ where: { publicationStatus: "DRAFT" } }),
    prisma.importRecord.count({ where: { status: { in: ["STAGED", "MANUAL_REVIEW"] } } }),
    prisma.importJob.count(),
  ]);
  return (
    <div className="university-admin">
      <header className="admin-dashboard-heading">
        <div><span>University intelligence</span><h1>University data</h1><p>Review source-backed pilot imports without exposing draft data publicly.</p></div>
      </header>
      <section className="university-data-metrics" aria-label="University data summary">
        <article><strong>{universities}</strong><span>Universities</span></article>
        <article><strong>{draftUniversities}</strong><span>Draft universities</span></article>
        <article><strong>{stagedRecords}</strong><span>Awaiting review</span></article>
        <article><strong>{jobs}</strong><span>Import jobs</span></article>
      </section>
      <nav className="university-data-links" aria-label="University data tools">
        <Link href="/admin/university-data/imports"><strong>Import history</strong><span>Inspect pilot jobs and record outcomes.</span></Link>
        <Link href="/admin/university-data/review"><strong>Review queue</strong><span>Approve or reject staged source records.</span></Link>
      </nav>
      <p className="university-data-notice">Approval is a review decision only. University, program, and scholarship records remain DRAFT.</p>
    </div>
  );
}

