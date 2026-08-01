import Link from "next/link";
import { headers } from "next/headers";
import type {
  UniversityManagementFilters,
  UniversityPublicationStatus,
  UniversityVerificationStatus,
} from "@/lib/university-intelligence";
import { fetchUniversityManagement } from "@/lib/university-intelligence/api/university-management.client";

export const dynamic = "force-dynamic";

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

const publicationStatuses: UniversityPublicationStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const verificationStatuses: UniversityVerificationStatus[] = [
  "DISCOVERED",
  "PARTNER_MATCHED",
  "OFFICIAL_VERIFIED",
  "MANUALLY_VERIFIED",
  "VERIFICATION_FAILED",
];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function supported<T extends string>(value: string | undefined, values: T[]): T | undefined {
  return value && values.includes(value as T) ? value as T : undefined;
}

export function universityManagementFilters(
  parameters: Awaited<PageSearchParams>,
): UniversityManagementFilters {
  return {
    query: first(parameters.q)?.trim() || undefined,
    country: first(parameters.country)?.trim() || undefined,
    publicationStatus: supported(first(parameters.publicationStatus), publicationStatuses),
    verificationStatus: supported(first(parameters.verificationStatus), verificationStatuses),
  };
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function formatUpdated(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" }).format(new Date(value));
}

async function apiRequestContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("University management API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { origin: `${protocol}://${host}`, cookie: requestHeaders.get("cookie") ?? "" };
}

export default async function UniversityManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  const filters = universityManagementFilters(await searchParams);
  const request = await apiRequestContext();
  const { result } = await fetchUniversityManagement(request.origin, filters, request.cookie);
  const statistics = [
    ["Total Universities", result.statistics.total],
    ["Published", result.statistics.published],
    ["Draft", result.statistics.draft],
    ["Pending Review", result.statistics.pendingReview],
    ["Officially Verified", result.statistics.officiallyVerified],
  ] as const;

  return (
    <div className="university-management-page">
      <header className="admin-dashboard-heading">
        <div><span className="login-eyebrow">University Intelligence</span><h1>University Management</h1><p>Manage universities imported into the University Intelligence Platform.</p></div>
        <div className="admin-heading-actions">
          <button className="button primary" type="button" disabled title="Coming soon">Import University</button>
          <Link className="button secondary" href="/admin/university-data/universities">Refresh</Link>
        </div>
      </header>

      <dl className="university-management-statistics">
        {statistics.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
      </dl>

      <form className="university-management-filters" method="get" role="search">
        <label><span>Search</span><input type="search" name="q" defaultValue={filters.query} placeholder="University name or location" /></label>
        <label><span>Country</span><select name="country" defaultValue={filters.country ?? ""}><option value="">All countries</option>{result.countries.map((country) => <option key={country}>{country}</option>)}</select></label>
        <label><span>Publication Status</span><select name="publicationStatus" defaultValue={filters.publicationStatus ?? ""}><option value="">All statuses</option>{publicationStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
        <label><span>Verification Status</span><select name="verificationStatus" defaultValue={filters.verificationStatus ?? ""}><option value="">All statuses</option>{verificationStatuses.map((status) => <option value={status} key={status}>{label(status)}</option>)}</select></label>
        <div className="university-management-filter-actions"><button className="button primary" type="submit">Apply filters</button><Link className="button secondary" href="/admin/university-data/universities">Reset</Link></div>
      </form>

      <section className="admin-table-card" aria-labelledby="university-management-table-heading">
        <div className="admin-table-heading"><div><span>University records</span><h2 id="university-management-table-heading">Universities</h2></div><small>{result.universities.length} result{result.universities.length === 1 ? "" : "s"}</small></div>
        <div className="admin-table-scroll"><table><thead><tr><th>University</th><th>Country</th><th>Programs (Published / Total)</th><th>Publication Status</th><th>Verification Status</th><th>Updated</th><th>Actions</th></tr></thead>
          <tbody>{result.universities.length ? result.universities.map((university) => <tr key={university.id}>
            <td data-label="University"><strong>{university.name}</strong></td>
            <td data-label="Country">{university.country ?? "Not provided"}</td>
            <td data-label="Programs">{university.programCount} / {university.totalProgramCount}</td>
            <td data-label="Publication Status"><span className={`university-status is-${university.publicationStatus.toLowerCase()}`}>{label(university.publicationStatus)}</span></td>
            <td data-label="Verification Status"><span className="university-status">{label(university.verificationStatus)}</span></td>
            <td data-label="Updated">{formatUpdated(university.updatedAt)}</td>
            <td data-label="Actions" className="university-management-actions">{university.publicationStatus === "PUBLISHED" ? <Link href={`/universities/${university.slug}`}>View Public</Link> : <span aria-disabled="true">View Public</span>}<Link href={`/admin/university-data/universities/${university.id}`}>Manage</Link></td>
          </tr>) : <tr><td className="admin-empty-row" colSpan={7}>No universities have been imported yet.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  );
}
