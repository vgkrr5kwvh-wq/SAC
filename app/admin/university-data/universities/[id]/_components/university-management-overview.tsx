import Link from "next/link";
import type { UniversityManagementOverviewApiResult } from "@/lib/university-intelligence/api/university-management-detail.client";
import { safePublicUrl } from "@/lib/university-intelligence/safe-public-url";
import { groupUniversityResourceLinks } from "@/lib/university-intelligence/university-resource-links";

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase());
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function activityStatus(value: string) {
  const normalized = value.toUpperCase();
  const icon = ["COMPLETED", "APPROVED", "IMPORTED", "UPDATED"].includes(normalized) ? "✓"
    : ["PENDING", "RUNNING", "STAGED", "MANUAL_REVIEW"].includes(normalized) ? "⏳"
      : ["REJECTED", "FAILED", "COMPLETED_WITH_ERRORS", "VERIFICATION_FAILED"].includes(normalized) ? "✕" : "";
  return `${label(value)}${icon ? ` ${icon}` : ""}`;
}

export function activityTimestamp(value: string, now = new Date()) {
  const timestamp = new Date(value);
  const difference = now.getTime() - timestamp.getTime();
  if (difference >= 0 && difference < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(difference / 60000));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
  if (today.getTime() - eventDay.getTime() === 24 * 60 * 60 * 1000) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(timestamp);
}

function provided(value: string | number | null) {
  return value === null || value === "" ? "Not provided" : value;
}

function SafeUrl({ value, children }: { value: string | null; children: React.ReactNode }) {
  const url = safePublicUrl(value);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{children}</a> : <>Not provided</>;
}

function ImagePreview({ kind, value, name }: { kind: "logo" | "banner"; value: string | null; name: string }) {
  const url = safePublicUrl(value);
  return <article className={`university-management-image is-${kind}`}>
    <h4>{label(kind)}</h4>
    {url ? <>
      <div className="university-management-image-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`${name} ${kind}`} />
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer">Open image</a>
    </> : <div className="university-management-image-placeholder">No {kind} available</div>}
  </article>;
}

function ActivityTime({ value }: { value: string }) {
  return <time dateTime={value} title={date(value)}>{activityTimestamp(value)}</time>;
}

export default function UniversityManagementOverview({ data }: { data: UniversityManagementOverviewApiResult }) {
  const { university, statistics } = data;
  const publicUrl = university.publicationStatus === "PUBLISHED" ? `/universities/${university.slug}` : null;
  const location = [university.country, university.state, university.city].filter(Boolean).join(" · ");
  const resourceGroups = groupUniversityResourceLinks(university.officialWebsiteUrl, university.links, data.sources.map((source) => ({ ...source, lastCheckedAt: source.lastCheckedAt ? new Date(source.lastCheckedAt) : null, lastSuccessfulSyncAt: source.lastSuccessfulSyncAt ? new Date(source.lastSuccessfulSyncAt) : null })));
  const latestSync = data.sources.reduce<(typeof data.sources)[number] | null>((latest, source) => {
    if (!source.lastSuccessfulSyncAt) return latest;
    if (!latest?.lastSuccessfulSyncAt) return source;
    return source.lastSuccessfulSyncAt > latest.lastSuccessfulSyncAt ? source : latest;
  }, null);
  const tabs = [
    ["Programs", statistics.totalPrograms],
    ["Scholarships", statistics.totalScholarships],
    ["Admission Requirements", data.tabCounts.admissionRequirements],
    ["Tuition", data.tabCounts.tuitionRecords],
    ["Intakes", data.tabCounts.intakes],
    ["Claims", data.tabCounts.claims],
    ["Sources", data.tabCounts.sources],
    ["History", data.tabCounts.history],
  ] as const;
  const quickStatistics = [
    ["Total programs", statistics.totalPrograms],
    ["Published programs", statistics.publishedPrograms],
    ["Total scholarships", statistics.totalScholarships],
    ["Pending review items", statistics.pendingReviewItems],
  ] as const;

  return <div className="university-management-detail">
    <header className="university-management-detail-header">
      <div><Link className="admin-back-link" href="/admin/university-data/universities">← Back to Universities</Link><div className="university-detail-admin-status"><span className={`university-status is-${university.publicationStatus.toLowerCase()}`}>{label(university.publicationStatus)}</span><span className="university-status">{label(university.verificationStatus)}</span></div><h1>{university.name}</h1><p>{location || "Location not provided"}</p></div>
      {publicUrl ? <Link className="button secondary" href={publicUrl}>View Public</Link> : null}
    </header>

    <nav className="university-management-tabs" aria-label="University management sections"><span aria-current="page">Overview</span><Link href={`/admin/university-data/universities/${university.id}/programs`}><b>Programs ({statistics.totalPrograms})</b></Link><Link href={`/admin/university-data/universities/${university.id}/scholarships`}><b>Scholarships ({statistics.totalScholarships})</b></Link>{tabs.slice(2).map(([tab, count]) => <span key={tab} aria-disabled="true"><b>{tab} ({count})</b><small>Coming soon</small></span>)}</nav>

    <section aria-labelledby="university-quick-statistics"><h2 className="sr-only" id="university-quick-statistics">Quick statistics</h2><dl className="university-management-detail-statistics">{quickStatistics.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}<div><dt>Latest import</dt><dd className="is-text">{data.latestImport ? activityStatus(data.latestImport.jobStatus) : "Not available"}</dd><small>{data.latestImport ? <ActivityTime value={data.latestImport.jobCreatedAt} /> : "No import activity"}</small></div></dl></section>

    <section className="admin-table-card university-management-profile" aria-labelledby="university-profile-heading"><div className="admin-table-heading"><div><span>Read-only data</span><h2 id="university-profile-heading">University profile</h2></div></div><div className="university-management-profile-groups">
      <section><h3>Location</h3><dl><div><dt>Country</dt><dd>{provided(university.country)}</dd></div><div><dt>State</dt><dd>{provided(university.state)}</dd></div><div><dt>City</dt><dd>{provided(university.city)}</dd></div><div className="is-wide"><dt>Address</dt><dd>{provided(university.address)}</dd></div></dl></section>
      <section><h3>Institution</h3><dl><div><dt>Name</dt><dd>{university.name}</dd></div><div><dt>Type</dt><dd>{provided(university.institutionType)}</dd></div><div><dt>Founded</dt><dd>{provided(university.foundedYear)}</dd></div><div><dt>Website</dt><dd><SafeUrl value={university.officialWebsiteUrl}>Open official website</SafeUrl></dd></div></dl></section>
      <section className="is-wide"><h3>Description</h3><p>{provided(university.description)}</p></section>
      <section className="is-wide"><h3>Images</h3><div className="university-management-images"><ImagePreview kind="logo" value={university.logoUrl} name={university.name} /><ImagePreview kind="banner" value={university.bannerImageUrl} name={university.name} /></div></section>
      <section className="is-wide"><h3>Metadata</h3><dl><div><dt>Created</dt><dd>{date(university.createdAt)}</dd></div><div><dt>Updated</dt><dd>{date(university.updatedAt)}</dd></div><div className="is-wide"><dt>Slug</dt><dd>{university.slug}</dd></div></dl></section>
    </div></section>

    <section className="admin-table-card university-management-resources" aria-labelledby="university-resources-heading"><div className="admin-table-heading"><div><span>Verified destinations</span><h2 id="university-resources-heading">Official links</h2></div></div><div>{resourceGroups.map((group) => <section key={group.title}><h3>{group.title}</h3>{group.links.length ? <ul>{group.links.map((link) => <li key={link.id}><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>)}</ul> : <p>Not provided</p>}</section>)}</div></section>

    <section className="admin-table-card university-management-activity" aria-labelledby="university-activity-heading"><div className="admin-table-heading"><div><span>Supported events</span><h2 id="university-activity-heading">Recent activity</h2></div></div><dl>
      {data.latestImport ? <><div><dt>Latest import job</dt><dd>{data.latestImport.sourceName} · {activityStatus(data.latestImport.jobStatus)}</dd><small><ActivityTime value={data.latestImport.jobCreatedAt} /></small></div><div><dt>Latest import record</dt><dd>{activityStatus(data.latestImport.recordStatus)}</dd><small><ActivityTime value={data.latestImport.recordCreatedAt} /></small></div></> : null}
      {data.latestReview ? <div><dt>Latest review</dt><dd>{activityStatus(data.latestReview.status)} · {data.latestReview.reviewer}</dd><small><ActivityTime value={data.latestReview.reviewedAt} /></small></div> : null}
      <div><dt>Latest university update</dt><dd><ActivityTime value={university.updatedAt} /></dd></div>
      {latestSync?.lastSuccessfulSyncAt ? <div><dt>Latest source synchronization</dt><dd>{latestSync.name}</dd><small><ActivityTime value={latestSync.lastSuccessfulSyncAt} /></small></div> : null}
    </dl></section>
  </div>;
}
