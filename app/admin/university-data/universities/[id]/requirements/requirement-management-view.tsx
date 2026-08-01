import Link from "next/link";
import type { AdmissionRequirementManagementFilters } from "@/lib/university-intelligence";
import type { UniversityAdmissionRequirementManagementApiResponse } from "@/lib/university-intelligence/api/admission-requirement-management.client";

function label(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase()); }
function value(value: string | number | null) { return typeof value === "number" ? value > 0 ? value.toLocaleString("en") : "—" : value?.trim() || "—"; }
export function required(value: boolean | null) { return value === null ? "—" : value ? "Required" : "Optional"; }
export function accepted(value: boolean | null) { return value === null ? "—" : value ? "Accepted" : "Not Accepted"; }
function letters(value: number | null) { return value === null ? "—" : value > 0 ? `Required (${value})` : "Optional"; }
function updated(value: string) { return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(new Date(value)); }

function filterHref(baseRoute: string, filters: AdmissionRequirementManagementFilters, override: Partial<AdmissionRequirementManagementFilters> = {}) {
  const next = { ...filters, ...override };
  const params = new URLSearchParams();
  const values = { q: next.query, studyLevel: next.studyLevel, degreeLevel: next.degreeLevel, programId: next.programId, publicationStatus: next.publicationStatus, verificationStatus: next.verificationStatus, scope: next.scope };
  for (const [name, item] of Object.entries(values)) if (item) params.set(name, item);
  return `${baseRoute}/requirements${params.size ? `?${params}` : ""}`;
}

function statisticActive(name: string, filters: AdmissionRequirementManagementFilters) {
  if (name === "Published") return filters.publicationStatus === "PUBLISHED";
  if (name === "Draft") return filters.publicationStatus === "DRAFT";
  if (name === "Officially Verified") return filters.verificationStatus === "OFFICIAL_VERIFIED";
  if (name === "University-wide") return filters.scope === "university-wide";
  if (name === "Program-specific") return filters.scope === "program-specific";
  return !filters.publicationStatus && !filters.verificationStatus && !filters.scope;
}

export default function AdmissionRequirementManagementView({ data, filters }: { data: UniversityAdmissionRequirementManagementApiResponse; filters: AdmissionRequirementManagementFilters }) {
  const { university, result } = data;
  const baseRoute = `/admin/university-data/universities/${university.id}`;
  const statistics = [
    ["Total Requirements", result.statistics.total, {}],
    ["Published", result.statistics.published, { publicationStatus: "PUBLISHED" }],
    ["Draft", result.statistics.draft, { publicationStatus: "DRAFT" }],
    ["Officially Verified", result.statistics.officiallyVerified, { verificationStatus: "OFFICIAL_VERIFIED" }],
    ["University-wide", result.statistics.universityWide, { scope: "university-wide" }],
    ["Program-specific", result.statistics.programSpecific, { scope: "program-specific" }],
  ] as const;
  const verificationStatuses = ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"];

  return <div className="requirement-management-page">
    <header className="program-management-header"><div><span className="login-eyebrow">University Intelligence</span><h1>Admission Requirements</h1><p>{university.name} · {result.statistics.total} total requirement record{result.statistics.total === 1 ? "" : "s"}</p></div><div className="admin-heading-actions"><Link className="button secondary" href={baseRoute}>Back to University</Link><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div></header>
    <dl className="university-management-statistics requirement-management-statistics">{statistics.map(([name, count, override]) => { const active = statisticActive(name, filters); return <div className={active ? "is-active" : undefined} key={name}><dt>{name}</dt><dd>{count}</dd><Link className="requirement-statistic-link" href={filterHref(baseRoute, filters, override)} aria-current={active ? "page" : undefined}><span className="sr-only">Filter requirements by {name}</span></Link></div>; })}</dl>
    <form className="requirement-management-filters" method="get" role="search">
      <label><span>Search</span><input type="search" name="q" defaultValue={filters.query} placeholder="Program or requirement" /></label>
      <label><span>Study Level</span><select name="studyLevel" defaultValue={filters.studyLevel ?? ""}><option value="">All study levels</option>{result.options.studyLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Degree Level</span><select name="degreeLevel" defaultValue={filters.degreeLevel ?? ""}><option value="">All degree levels</option>{result.options.degreeLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Program</span><select name="programId" defaultValue={filters.programId ?? ""}><option value="">All programs</option>{result.options.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label>
      <label><span>Publication Status</span><select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""}><option value="">All statuses</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Verification Status</span><select name="verificationStatus" defaultValue={filters.verificationStatus ?? ""}><option value="">All statuses</option>{verificationStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <div className="requirement-management-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button secondary" href={`${baseRoute}/requirements`}>Reset</Link></div>
    </form>
    <section className="admin-table-card" aria-labelledby="requirement-management-table-heading"><div className="admin-table-heading"><div><span>Read-only records</span><h2 id="requirement-management-table-heading">Admission Requirements</h2></div><small>Showing {result.requirements.length} of {result.statistics.total} requirements</small></div><div className="admin-table-scroll"><table className="requirement-management-table"><thead><tr><th>Program</th><th>Study Level</th><th>Degree</th><th>IELTS</th><th>TOEFL</th><th>PTE</th><th>Duolingo</th><th>GPA</th><th>MOI</th><th>Backlogs</th><th>SOP</th><th>LOR</th><th>Resume</th><th>Passport</th><th>Interview</th><th>Publication Status</th><th>Verification</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {result.requirements.length ? result.requirements.map((requirement) => <tr key={requirement.id}><td data-label="Program">{requirement.scope === "university-wide" ? <span className="requirement-scope">University-wide</span> : value(requirement.programName)}</td><td data-label="Study Level" className={!requirement.studyLevel ? "requirement-placeholder" : undefined}>{value(requirement.studyLevel)}</td><td data-label="Degree" className={!requirement.degreeLevel ? "requirement-placeholder" : undefined}>{value(requirement.degreeLevel)}</td><td data-label="IELTS" className={!requirement.ieltsOverall ? "requirement-placeholder" : undefined}>{value(requirement.ieltsOverall)}</td><td data-label="TOEFL" className={!requirement.toeflOverall ? "requirement-placeholder" : undefined}>{value(requirement.toeflOverall)}</td><td data-label="PTE" className={!requirement.pteOverall ? "requirement-placeholder" : undefined}>{value(requirement.pteOverall)}</td><td data-label="Duolingo" className={!requirement.duolingoOverall ? "requirement-placeholder" : undefined}>{value(requirement.duolingoOverall)}</td><td data-label="GPA" className={!requirement.minimumGpa ? "requirement-placeholder" : undefined}>{value(requirement.minimumGpa)}</td><td data-label="MOI" className={requirement.moiAccepted === null ? "requirement-placeholder" : undefined}>{accepted(requirement.moiAccepted)}</td><td data-label="Backlogs" className={requirement.backlogsAccepted === null ? "requirement-placeholder" : undefined}>{accepted(requirement.backlogsAccepted)}</td><td data-label="SOP" className={requirement.statementOfPurposeRequired === null ? "requirement-placeholder" : undefined}>{required(requirement.statementOfPurposeRequired)}</td><td data-label="LOR" className={requirement.recommendationLetters === null ? "requirement-placeholder" : undefined}>{letters(requirement.recommendationLetters)}</td><td data-label="Resume" className={requirement.resumeRequired === null ? "requirement-placeholder" : undefined}>{required(requirement.resumeRequired)}</td><td data-label="Passport" className={requirement.passportRequired === null ? "requirement-placeholder" : undefined}>{required(requirement.passportRequired)}</td><td data-label="Interview" className={requirement.interviewRequired === null ? "requirement-placeholder" : undefined}>{required(requirement.interviewRequired)}</td><td data-label="Publication Status"><span className={`university-status is-${requirement.publicationStatus.toLowerCase()}`}>{label(requirement.publicationStatus)}</span></td><td data-label="Verification"><span className="university-status">{label(requirement.verificationStatus)}</span></td><td data-label="Updated">{updated(requirement.updatedAt)}</td><td data-label="Actions" className="requirement-management-actions"><Link href={`/admin/university-data/requirements/${requirement.id}`}>Open Details</Link><span aria-disabled="true" title="Public admission requirement pages are not available">View Public</span></td></tr>) : <tr><td className="admin-empty-row requirement-empty-state" colSpan={19}><strong>No admission requirements found</strong><p>No admission requirements have been imported or reviewed for this university yet.</p><small>Run enrichment or import reviewed admission requirements to populate this section.</small></td></tr>}
    </tbody></table></div></section>
  </div>;
}
