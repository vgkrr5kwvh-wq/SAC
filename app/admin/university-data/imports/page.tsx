import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UniversityImportJobsPage() {
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="university-admin">
      <header className="admin-dashboard-heading">
        <div><span>University intelligence</span><h1>Import history</h1><p>Local CLI pilot activity and source-level outcomes.</p></div>
        <Link className="university-data-back" href="/admin/university-data">University data</Link>
      </header>
      <section className="admin-table-card"><div className="admin-table-scroll"><table>
        <thead><tr><th>Source</th><th>Status</th><th>Mode</th><th>Started</th><th>Discovered</th><th>Imported</th><th>Updated</th><th>Skipped</th><th>Failed</th></tr></thead>
        <tbody>
          {jobs.map((job) => <tr key={job.id}>
            <td data-label="Source">{job.sourceName}</td><td data-label="Status">{job.status.replaceAll("_", " ")}</td>
            <td data-label="Mode">{job.mode.replaceAll("_", " ")}</td><td data-label="Started">{job.startedAt?.toLocaleString() ?? "Not started"}</td>
            <td data-label="Discovered">{job.discoveredCount}</td><td data-label="Imported">{job.importedCount}</td>
            <td data-label="Updated">{job.updatedCount}</td><td data-label="Skipped">{job.skippedCount}</td><td data-label="Failed">{job.failedCount}</td>
          </tr>)}
          {jobs.length === 0 ? <tr><td colSpan={9}>No import jobs have been recorded.</td></tr> : null}
        </tbody>
      </table></div></section>
    </div>
  );
}

