import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ReviewControls from "./review-controls";
import { reviewQueueWhere } from "./review-queue";

export const dynamic = "force-dynamic";

function stringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function payloadObject(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue> : {};
}

function display(value: Prisma.JsonValue | undefined): string {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default async function UniversityReviewPage() {
  const records = await prisma.importRecord.findMany({
    where: reviewQueueWhere,
    include: {
      importJob: { select: { sourceName: true } },
      fieldClaims: { orderBy: [{ fieldName: "asc" }, { isPreferred: "desc" }] },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <div className="university-admin">
      <header className="admin-dashboard-heading">
        <div><span>University intelligence</span><h1>Review queue</h1><p>Inspect provenance, gaps, validation, and duplicate signals before making a review decision.</p></div>
        <Link className="university-data-back" href="/admin/university-data">University data</Link>
      </header>
      <div className="university-review-list">
        {records.map((record) => {
          const payload = payloadObject(record.normalizedPayload);
          const scholarships = Array.isArray(payload.scholarships) ? payload.scholarships : [];
          const firstScholarship = payloadObject(scholarships[0] ?? {});
          const enrichment = record.entityType === "university-enrichment";
          const metadata = payloadObject(record.enrichmentMetadata ?? {});
          const groupedClaims = Map.groupBy(record.fieldClaims, (claim) =>
            `${claim.fieldName}|${claim.studyLevel ?? ""}|${claim.entryRoute ?? ""}|${claim.academicYear ?? ""}|${claim.programId ?? ""}`
          );
          return <article key={record.id} className="university-review-card">
            <header><div><span>{record.importJob.sourceName}</span><h2>{record.entityName ?? "Unnamed university"}</h2></div><strong>{record.status.replaceAll("_", " ")}</strong></header>
            <ReviewControls
              recordId={record.id}
              enrichment={enrichment}
              status={record.status}
              entityType={record.entityType}
              createdAt={record.createdAt.toISOString()}
              claimCount={record.fieldClaims.length}
            />
            <dl id={`record-details-${record.id}`}>
              {["country", "state", "city", "institutionType", "foundedYear", "officialWebsiteUrl"].map((field) =>
                <div key={field}><dt>{field.replace(/([A-Z])/g, " $1")}</dt><dd>{display(payload[field])}</dd></div>
              )}
              <div><dt>Scholarship availability</dt><dd>{display(firstScholarship.scholarshipAvailable)}</dd></div>
            </dl>
            <div className="university-review-flags">
              <section><h3>Missing fields</h3><p>{stringArray(record.missingFields).join(", ") || "None reported"}</p></section>
              <section><h3>Validation errors</h3><p>{stringArray(record.validationErrors).join("; ") || "None reported"}</p></section>
              <section><h3>Duplicate warning</h3><p>{record.duplicateWarning ?? "No warning"}</p></section>
            </div>
            <div className="university-review-links">
              <a href={record.sourceUrl} target="_blank" rel="noreferrer">Source profile</a>
              {typeof firstScholarship.scholarshipUrl === "string" ? <a href={firstScholarship.scholarshipUrl} target="_blank" rel="noreferrer">Scholarship page</a> : <span>No scholarship link supplied</span>}
            </div>
            {enrichment ? <section className="university-enrichment-review">
              <h3>Source roles</h3>
              <dl>
                <div><dt>Verified factual source</dt><dd>{display(metadata.verifiedFactualSource)}</dd></div>
                <div><dt>Discovered through</dt><dd>{display(metadata.discoveredThrough)}</dd></div>
                <div><dt>Secondary comparison</dt><dd>{display(metadata.secondaryComparison)}</dd></div>
              </dl>
              <h3>Official pages checked</h3>
              <pre>{JSON.stringify(metadata.officialPagesChecked ?? [], null, 2)}</pre>
              <h3>Field comparisons</h3>
              <div className="university-claim-groups" id={`claims-${record.id}`}>
                {[...groupedClaims.entries()].map(([key, claims]) => {
                  const preferred = claims.find((claim) => claim.isPreferred) ?? claims[0];
                  const competing = claims.filter((claim) => claim.id !== preferred.id);
                  const conflict = claims.some((claim) => claim.conflictStatus !== "NONE");
                  return <details key={key} open={conflict} className={conflict ? "has-conflict" : undefined}>
                    <summary>
                      <strong>{preferred.fieldName}</strong>
                      <span>{claims.length} claim{claims.length === 1 ? "" : "s"} · {preferred.conflictStatus.replaceAll("_", " ")}</span>
                    </summary>
                    <div className="university-claim-group-content">
                      <p><b>Scope:</b> {[preferred.studyLevel, preferred.entryRoute, preferred.academicYear, preferred.programId ? "program-specific" : "university-wide"].filter(Boolean).join(" · ")}</p>
                      <p><b>Preferred:</b> {JSON.stringify(preferred.valueJson)} — {preferred.sourceName} ({preferred.authorityLevel.replaceAll("_", " ")}, confidence {preferred.confidence})</p>
                      <a href={preferred.sourceUrl} target="_blank" rel="noreferrer">Preferred source</a>
                      {competing.length ? <ul>{competing.map((claim) => <li key={claim.id}>
                        {JSON.stringify(claim.valueJson)} — {claim.sourceName}, {claim.authorityLevel.replaceAll("_", " ")}, confidence {claim.confidence} · <a href={claim.sourceUrl} target="_blank" rel="noreferrer">source</a>
                      </li>)}</ul> : <p>No competing value.</p>}
                      {conflict ? <p><b>Reason:</b> Higher-authority value retained for the same scope; review required.</p> : null}
                    </div>
                  </details>;
                })}
              </div>
            </section> : null}
            <details><summary>Extracted payload</summary><pre>{JSON.stringify(payload, null, 2)}</pre></details>
          </article>;
        })}
        {records.length === 0 ? <p className="university-data-notice">No records are awaiting review.</p> : null}
      </div>
    </div>
  );
}
