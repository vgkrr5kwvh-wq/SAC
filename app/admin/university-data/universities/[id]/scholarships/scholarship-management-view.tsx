import Link from "next/link";
import type { ScholarshipManagementFilters } from "@/lib/university-intelligence";
import type { UniversityScholarshipManagementApiResponse } from "@/lib/university-intelligence/api/scholarship-management.client";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function valueOrDash(value: string | null) {
  return value?.trim() || "—";
}

export function scholarshipAward(scholarship: UniversityScholarshipManagementApiResponse["result"]["scholarships"][number]) {
  if (scholarship.amountText?.trim()) return scholarship.amountText.trim();
  const minimum = scholarship.minimumAmount && scholarship.minimumAmount > 0 ? scholarship.minimumAmount : null;
  const maximum = scholarship.maximumAmount && scholarship.maximumAmount > 0 ? scholarship.maximumAmount : null;
  if (minimum && maximum) return minimum === maximum ? minimum.toLocaleString("en") : `${minimum.toLocaleString("en")}–${maximum.toLocaleString("en")}`;
  return (minimum ?? maximum)?.toLocaleString("en") ?? "—";
}

function updated(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(new Date(value));
}

function statisticsHref(baseRoute: string, filters: ScholarshipManagementFilters, override: Partial<ScholarshipManagementFilters> = {}) {
  const nextFilters = { ...filters, ...override };
  const params = new URLSearchParams();
  if (nextFilters.query) params.set("q", nextFilters.query);
  if (nextFilters.availability) params.set("availability", nextFilters.availability);
  if (nextFilters.scholarshipType) params.set("scholarshipType", nextFilters.scholarshipType);
  if (nextFilters.studyLevel) params.set("studyLevel", nextFilters.studyLevel);
  if (nextFilters.scope) params.set("scope", nextFilters.scope);
  if (nextFilters.publicationStatus) params.set("publicationStatus", nextFilters.publicationStatus);
  if (nextFilters.verificationStatus) params.set("verificationStatus", nextFilters.verificationStatus);
  const query = params.toString();
  return `${baseRoute}/scholarships${query ? `?${query}` : ""}`;
}

export default function ScholarshipManagementView({ data, filters }: { data: UniversityScholarshipManagementApiResponse; filters: ScholarshipManagementFilters }) {
  const { university, result } = data;
  const baseRoute = `/admin/university-data/universities/${university.id}`;
  const statistics = [
    ["Total Scholarships", result.statistics.total, {}],
    ["Published", result.statistics.published, { publicationStatus: "PUBLISHED" }],
    ["Draft", result.statistics.draft, { publicationStatus: "DRAFT" }],
    ["Available", result.statistics.available, { availability: "AVAILABLE" }],
    ["Unavailable", result.statistics.unavailable, { availability: "UNAVAILABLE" }],
    ["Unknown", result.statistics.unknown, { availability: "UNKNOWN" }],
    ["University-wide", result.statistics.universityWide, { scope: "university-wide" }],
    ["Program-specific", result.statistics.programSpecific, { scope: "program-specific" }],
  ] as const;
  const verificationStatuses = ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"];

  return <div className="scholarship-management-page">
    <header className="program-management-header"><div><span className="login-eyebrow">University Intelligence</span><h1>Scholarships</h1><p>{university.name} · {result.statistics.total} total scholarship record{result.statistics.total === 1 ? "" : "s"}</p></div><div className="admin-heading-actions"><Link className="button secondary" href={baseRoute}>Back to University</Link><Link className="button secondary" href="/admin/university-data/universities">Back to Universities</Link></div></header>
    <dl className="university-management-statistics scholarship-management-statistics">{statistics.map(([name, count, override]) => <div key={name}><dt>{name}</dt><dd>{count}</dd><Link className="scholarship-statistic-link" href={statisticsHref(baseRoute, filters, override)}><span className="sr-only">Filter scholarships by {name}</span></Link></div>)}</dl>

    <form className="scholarship-management-filters" method="get" role="search">
      <label><span>Search</span><input type="search" name="q" defaultValue={filters.query} placeholder="Scholarship, program, or eligibility" /></label>
      <label><span>Availability</span><select name="availability" defaultValue={filters.availability ?? ""}><option value="">All availability</option>{["AVAILABLE", "UNAVAILABLE", "UNKNOWN"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Scholarship Type</span><select name="scholarshipType" defaultValue={filters.scholarshipType ?? ""}><option value="">All types</option>{result.options.scholarshipTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Study Level</span><select name="studyLevel" defaultValue={filters.studyLevel ?? ""}><option value="">All study levels</option>{result.options.studyLevels.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Scope</span><select name="scope" defaultValue={filters.scope ?? ""}><option value="">All</option><option value="university-wide">University-wide</option><option value="program-specific">Program-specific</option></select></label>
      <label><span>Publication Status</span><select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""}><option value="">All statuses</option>{["DRAFT", "PUBLISHED", "ARCHIVED"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label><span>Verification Status</span><select name="verificationStatus" defaultValue={filters.verificationStatus ?? ""}><option value="">All statuses</option>{verificationStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <div className="scholarship-management-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button secondary" href={`${baseRoute}/scholarships`}>Reset filters</Link></div>
    </form>

    <section className="admin-table-card" aria-labelledby="scholarship-management-table-heading"><div className="admin-table-heading"><div><span>Read-only records</span><h2 id="scholarship-management-table-heading">Scholarships</h2></div><small>Showing {result.scholarships.length} of {result.statistics.total} scholarships</small></div><div className="admin-table-scroll"><table className="scholarship-management-table"><thead><tr><th>Scholarship</th><th>Scope</th><th>Program</th><th>Availability</th><th>Award</th><th>Currency</th><th>Type</th><th>Study Level</th><th>Deadline</th><th>Publication Status</th><th>Verification Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>
      {result.scholarships.length ? result.scholarships.map((scholarship) => { const award = scholarshipAward(scholarship); const program = scholarship.scope === "university-wide" ? "University-wide" : valueOrDash(scholarship.programName); return <tr key={scholarship.id}><td data-label="Scholarship"><strong>{scholarship.name?.trim() || "Scholarship draft"}</strong></td><td data-label="Scope"><span className={`scholarship-scope is-${scholarship.scope}`}>{scholarship.scope === "university-wide" ? "University-wide" : "Program-specific"}</span></td><td data-label="Program" className={program === "—" ? "scholarship-table-placeholder" : undefined}>{program}</td><td data-label="Availability"><span className={`scholarship-availability is-${scholarship.availability.toLowerCase()}`}>{label(scholarship.availability)}</span></td><td data-label="Award" className={award === "—" ? "scholarship-table-placeholder" : undefined}>{award}</td><td data-label="Currency" className={!scholarship.currency ? "scholarship-table-placeholder" : undefined}>{valueOrDash(scholarship.currency)}</td><td data-label="Type" className={!scholarship.scholarshipType ? "scholarship-table-placeholder" : undefined}>{valueOrDash(scholarship.scholarshipType)}</td><td data-label="Study Level" className={!scholarship.studyLevel ? "scholarship-table-placeholder" : undefined}>{valueOrDash(scholarship.studyLevel)}</td><td data-label="Deadline" className={!scholarship.deadlineText ? "scholarship-table-placeholder" : undefined}>{valueOrDash(scholarship.deadlineText)}</td><td data-label="Publication Status"><span className={`university-status is-${scholarship.publicationStatus.toLowerCase()}`}>{label(scholarship.publicationStatus)}</span></td><td data-label="Verification Status"><span className="university-status">{label(scholarship.verificationStatus)}</span></td><td data-label="Updated">{updated(scholarship.updatedAt)}</td><td data-label="Actions" className="scholarship-management-actions"><Link href={`/admin/university-data/scholarships/${scholarship.id}`}>Open Details</Link><span aria-disabled="true" title="Public scholarship pages are not available">View Public</span></td></tr>; }) : <tr><td className="admin-empty-row" colSpan={13}>No scholarships found.</td></tr>}
    </tbody></table></div></section>
  </div>;
}
