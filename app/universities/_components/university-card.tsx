import Link from "next/link";
import type { UniversitySummary } from "@/lib/university-intelligence";

const verificationLabels = {
  DISCOVERED: "Source discovered",
  PARTNER_MATCHED: "Partner matched",
  OFFICIAL_VERIFIED: "Officially verified",
  MANUALLY_VERIFIED: "Manually verified",
  VERIFICATION_FAILED: "Verification pending",
} as const;

function location(university: UniversitySummary): string {
  return [university.city, university.state, university.country]
    .filter(Boolean)
    .join(", ") || "Location not provided";
}

export default function UniversityCard({
  university,
}: {
  university: UniversitySummary;
}) {
  const showOfficialWebsite = university.officialWebsiteUrl
    && (
      university.verificationStatus === "OFFICIAL_VERIFIED"
      || university.verificationStatus === "MANUALLY_VERIFIED"
    );

  return (
    <article className="university-card">
      <div className="university-card-topline">
        <span className={`university-verification is-${university.verificationStatus.toLowerCase()}`}>
          {verificationLabels[university.verificationStatus]}
        </span>
        <span className="university-program-count">
          {university.programCount}{" "}
          {university.programCount === 1 ? "programme" : "programmes"}
        </span>
      </div>
      <div>
        <p className="university-location">{location(university)}</p>
        <h2>
          <Link href={`/universities/${university.slug}`}>
            {university.name}
          </Link>
        </h2>
        <p className="university-type">
          {university.institutionType || "Institution type not provided"}
        </p>
      </div>
      <div className="university-card-actions">
        <Link
          className="university-detail-link"
          href={`/universities/${university.slug}`}
        >
          View university
          <span aria-hidden="true">→</span>
        </Link>
        {showOfficialWebsite ? (
          <a
            className="university-official-link"
            href={university.officialWebsiteUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official website
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}
