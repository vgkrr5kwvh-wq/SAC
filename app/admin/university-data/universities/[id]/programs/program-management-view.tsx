import Link from "next/link";
import type { ProgramManagementFilters } from "@/lib/university-intelligence";
import type { UniversityProgramManagementApiResponse } from "@/lib/university-intelligence/api/program-management.client";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function provided(value: string | null) {
  return value?.trim() || "—";
}

function degree(program: UniversityProgramManagementApiResponse["result"]["programs"][number]) {
  const value = `${program.studyLevel ?? ""} ${program.degreeLevel ?? ""}`.toLowerCase();
  if (/undergraduate|bachelor/.test(value)) return "Undergraduate";
  if (/graduate|master|doctoral|doctorate|phd/.test(value)) return "Graduate";
  return provided(program.studyLevel ?? program.degreeLevel);
}

function tuition(amount: number | null, currency: string | null) {
  if (amount === null) return "—";
  if (!currency) return amount.toLocaleString("en");
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString("en")} ${currency}`;
  }
}

function updated(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(new Date(value));
}

export default function ProgramManagementView({ data, filters }: { data: UniversityProgramManagementApiResponse; filters: ProgramManagementFilters }) {
  const { university, result } = data;
  const statistics = [
    ["Total Programs", result.statistics.total],
    ["Published", result.statistics.published],
    ["Draft", result.statistics.draft],
    ["Undergraduate", result.statistics.undergraduate],
    ["Graduate", result.statistics.graduate],
  ] as const;
  const baseRoute = `/admin/university-data/universities/${university.id}`;

  return <div className="program-management-page">
    <header className="program-management-header"><div><span className="login-eyebrow">University Intelligence</span><h1>Programs</h1><p>{university.name} · {result.statistics.total} total program{result.statistics.total === 1 ? "" : "s"}</p></div><div className="admin-heading-actions"><Link className="button secondary" href={baseRoute}>Back to University</Link><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div></header>

    <dl className="university-management-statistics">{statistics.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>

    <form className="program-management-filters" method="get" role="search">
      <label><span>Search</span><input type="search" name="q" defaultValue={filters.query} placeholder="Program or department" /></label>
      <label><span>Degree Level</span><select name="degreeLevel" defaultValue={filters.degreeLevel ?? ""}><option value="">All degree levels</option>{result.options.degreeLevels.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Campus</span><select name="campus" defaultValue={filters.campus ?? ""}><option value="">All campuses</option>{result.options.campuses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Intake</span><select name="intake" defaultValue={filters.intake ?? ""}><option value="">All intakes</option>{result.options.intakes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>Publication Status</span><select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""}><option value="">All statuses</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
      <div className="program-management-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button secondary" href={`${baseRoute}/programs`}>Reset Filters</Link></div>
    </form>

    <section className="admin-table-card" aria-labelledby="program-management-table-heading"><div className="admin-table-heading"><div><span>Read-only records</span><h2 id="program-management-table-heading">Programs</h2></div><small>Showing {result.programs.length} of {result.statistics.total} programs</small></div><div className="admin-table-scroll"><table className="program-management-table"><thead><tr><th>Program</th><th>Degree</th><th>Department</th><th>Campus</th><th>Duration</th><th>Tuition</th><th>Intakes</th><th>Publication Status</th><th>Verification Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {result.programs.length ? result.programs.map((program) => <tr key={program.id}><td data-label="Program"><strong className="program-management-title" title={program.name}>{program.name}</strong></td><td data-label="Degree" className="program-management-degree">{degree(program)}</td><td data-label="Department" className={!program.department ? "program-management-placeholder" : undefined}>{provided(program.department)}</td><td data-label="Campus" className={!program.campus ? "program-management-placeholder" : undefined}>{provided(program.campus)}</td><td data-label="Duration" className={!program.durationText ? "program-management-placeholder" : undefined}>{provided(program.durationText)}</td><td data-label="Tuition" className={program.startingTuition === null ? "program-management-placeholder" : undefined}>{tuition(program.startingTuition, program.tuitionCurrency)}</td><td data-label="Intakes"><span className="program-management-intakes"><strong>{program.intakeCount}</strong><small>{program.intakeCount === 0 ? "No intakes" : `${program.intakeCount} intake${program.intakeCount === 1 ? "" : "s"}`}</small></span></td><td data-label="Publication Status"><span className={`university-status is-${program.publicationStatus.toLowerCase()}`}>{label(program.publicationStatus)}</span></td><td data-label="Verification Status"><span className="university-status">{label(program.verificationStatus)}</span></td><td data-label="Updated">{updated(program.updatedAt)}</td><td data-label="Actions" className="program-management-actions"><Link href={`/admin/university-data/programs/${program.id}`}>Open Details</Link><span aria-disabled="true" title="Public program pages are not available">View Public</span></td></tr>) : <tr><td className="admin-empty-row" colSpan={11}>No programs found.</td></tr>}
    </tbody></table></div></section>
  </div>;
}
