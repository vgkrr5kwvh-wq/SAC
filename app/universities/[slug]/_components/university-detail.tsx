import Link from "next/link";
import type { UniversityDetailApiResponse } from "@/lib/university-intelligence/api/university-detail.client";
import { safePublicUrl } from "@/lib/university-intelligence/safe-public-url";

const verificationLabels = {
  DISCOVERED: "Source discovered",
  PARTNER_MATCHED: "Partner matched",
  OFFICIAL_VERIFIED: "Officially verified",
  MANUALLY_VERIFIED: "Manually verified",
  VERIFICATION_FAILED: "Verification pending",
} as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function location(
  university: UniversityDetailApiResponse["university"],
): string {
  return [university.city, university.state, university.country]
    .filter(Boolean)
    .join(", ") || "Location not provided";
}

function money(
  amount: number | null,
  currency: string | null,
): string {
  if (amount === null) return "Tuition not provided";
  if (!currency) return amount.toLocaleString("en");
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("en")} ${currency}`;
  }
}

function scholarshipAmount(
  scholarship: UniversityDetailApiResponse["scholarships"]["items"][number],
): string {
  if (scholarship.amountText) return scholarship.amountText;
  if (
    scholarship.minimumAmount !== null
    && scholarship.maximumAmount !== null
  ) {
    return `${money(scholarship.minimumAmount, scholarship.currency)} – ${money(scholarship.maximumAmount, scholarship.currency)}`;
  }
  return money(
    scholarship.minimumAmount ?? scholarship.maximumAmount,
    scholarship.currency,
  ).replace("Tuition", "Award");
}

export default function UniversityDetailView({
  data,
}: {
  data: UniversityDetailApiResponse;
}) {
  const { university, programs, scholarships } = data;
  const officialWebsite = safePublicUrl(university.officialWebsiteUrl);
  const logo = safePublicUrl(university.logoUrl);
  const banner = safePublicUrl(university.bannerImageUrl);
  const publicLinks = [
    ...(officialWebsite
      ? [{
          id: "official-website",
          type: "official website",
          label: "Official website",
          url: officialWebsite,
        }]
      : []),
    ...university.links.flatMap((link) => {
      const url = safePublicUrl(link.url);
      const label = link.label?.trim();
      return url && label ? [{ ...link, label, url }] : [];
    }),
  ].filter((link, index, links) =>
    links.findIndex((candidate) => candidate.url === link.url) === index
  );
  const linkGroups = [
    {
      title: "Official university resources",
      links: publicLinks.filter((link) =>
        !link.type.startsWith("program-directory-")
        && link.type !== "source-listing"
      ),
    },
    {
      title: "Program directories",
      links: publicLinks.filter((link) =>
        link.type.startsWith("program-directory-")
      ),
    },
    {
      title: "Partner and source references",
      links: publicLinks.filter((link) => link.type === "source-listing"),
    },
  ].filter((group) => group.links.length);

  return (
    <main>
      <section
        className={`university-detail-hero${banner ? " has-banner" : ""}`}
        style={banner ? { backgroundImage: `linear-gradient(90deg, rgba(8,22,34,.94), rgba(8,22,34,.68)), url("${banner}")` } : undefined}
      >
        <div className="shell">
          <div className="university-detail-breadcrumb">
            <Link href="/universities">Universities</Link>
            <span>→</span>
            <strong>{university.name}</strong>
          </div>
          <div className="university-detail-identity">
            <div
              className={`university-detail-logo${logo ? " has-logo" : ""}`}
              style={logo ? { backgroundImage: `url("${logo}")` } : undefined}
              role="img"
              aria-label={logo
                ? `${university.name} logo`
                : `${university.name} initials`}
            >
              {logo ? null : initials(university.name)}
            </div>
            <div>
              <span className="university-detail-verification">
                {verificationLabels[university.verificationStatus]}
              </span>
              <h1>{university.name}</h1>
              <p>{location(university)}</p>
              <div className="university-detail-actions">
                {officialWebsite ? (
                  <a
                    className="button secondary"
                    href={officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official website
                  </a>
                ) : null}
                <a
                  className="button primary"
                  href="https://sac.osom.global/1/student"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply through Self Apply Center
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section university-detail-section">
        <div className="shell university-overview-grid">
          <article>
            <span className="eyebrow">University overview</span>
            <h2>About {university.name}</h2>
            <p className="university-description">
              {university.description
                || "A public university description is not available yet."}
            </p>
          </article>
          <dl className="university-facts">
            <div><dt>Institution type</dt><dd>{university.institutionType || "Not provided"}</dd></div>
            <div><dt>Founded</dt><dd>{university.foundedYear ?? "Not provided"}</dd></div>
            <div><dt>Country</dt><dd>{university.country || "Not provided"}</dd></div>
            <div><dt>State or region</dt><dd>{university.state || "Not provided"}</dd></div>
            <div><dt>City</dt><dd>{university.city || "Not provided"}</dd></div>
            <div><dt>Address</dt><dd>{university.address || "Not provided"}</dd></div>
          </dl>
        </div>
      </section>

      <section className="section university-detail-section is-soft">
        <div className="shell">
          <div className="university-section-heading">
            <div><span className="eyebrow">Study options</span><h2>Programs</h2></div>
            <p>{programs.pagination.totalItems} published programs</p>
          </div>
          {programs.items.length ? (
            <div className="university-program-grid">
              {programs.items.map((program) => (
                <article className="university-program-card" key={program.id}>
                  <div>
                    <span>{program.degreeLevel || program.studyLevel || "Degree level not provided"}</span>
                    <h3>{program.name}</h3>
                    <p>{program.campus || "Campus not provided"}</p>
                  </div>
                  <dl>
                    <div><dt>Starting tuition</dt><dd>{money(program.startingTuition, program.tuitionCurrency)}</dd></div>
                    <div><dt>Intakes</dt><dd>{program.intakeTerms.length ? program.intakeTerms.join(", ") : "Not provided"}</dd></div>
                    <div><dt>Scholarships</dt><dd>{program.scholarshipAvailable ? "Available" : "Not confirmed"}</dd></div>
                  </dl>
                  <Link href={`/universities/${university.slug}/programs/${program.slug}`}>
                    View program <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="university-detail-empty">
              <h3>No published programs yet.</h3>
              <p>Program information will appear after it has been reviewed and published.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section university-detail-section">
        <div className="shell">
          <div className="university-section-heading">
            <div><span className="eyebrow">Funding</span><h2>Scholarships</h2></div>
            <p>{scholarships.pagination.totalItems} published scholarships</p>
          </div>
          {scholarships.items.length ? (
            <div className="university-scholarship-grid">
              {scholarships.items.map((scholarship) => {
                const scholarshipUrl = safePublicUrl(scholarship.scholarshipUrl);
                return (
                  <article className="university-scholarship-card" key={scholarship.id}>
                    <span>{scholarship.scope === "university-wide" ? "University-wide" : `Program-specific${scholarship.program ? ` · ${scholarship.program.name}` : ""}`}</span>
                    <h3>{scholarship.name || "Scholarship name not provided"}</h3>
                    <strong>{scholarshipAmount(scholarship)}</strong>
                    <dl>
                      <div><dt>Deadline</dt><dd>{scholarship.deadlineText || "Not provided"}</dd></div>
                      <div><dt>Eligibility</dt><dd>{scholarship.eligibilitySummary || "Not provided"}</dd></div>
                    </dl>
                    {scholarshipUrl ? (
                      <a href={scholarshipUrl} target="_blank" rel="noopener noreferrer">
                        Scholarship details <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="university-detail-empty">
              <h3>No published scholarships yet.</h3>
              <p>Scholarship availability has not been published for this university.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section university-detail-section is-soft">
        <div className="shell university-detail-two-column">
          <div>
            <div className="university-section-heading">
              <div><span className="eyebrow">Entry information</span><h2>Admission requirements</h2></div>
            </div>
            {university.admissionRequirements.length ? (
              <div className="university-requirement-list">
                {university.admissionRequirements.map((requirement) => {
                  const requirementUrl = safePublicUrl(requirement.requirementUrl);
                  return (
                    <article key={requirement.id}>
                      <span>{[requirement.studyLevel, requirement.entryRoute].filter(Boolean).join(" · ") || "General requirement"}</span>
                      <h3>{requirement.program?.name || "University-wide admission requirement"}</h3>
                      <p>{requirement.academicRequirementText || "Academic requirement details are not provided."}</p>
                      <div className="university-score-list">
                        {requirement.minimumGpa !== null ? <span>GPA {requirement.minimumGpa}</span> : null}
                        {requirement.ieltsOverall !== null ? <span>IELTS {requirement.ieltsOverall}</span> : null}
                        {requirement.toeflOverall !== null ? <span>TOEFL {requirement.toeflOverall}</span> : null}
                      </div>
                      {requirementUrl ? <a href={requirementUrl} target="_blank" rel="noopener noreferrer">Official requirements ↗</a> : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="university-detail-empty is-compact">
                <h3>Admission requirements are not available yet.</h3>
                <p>Confirm current requirements directly with the university.</p>
              </div>
            )}
          </div>
          <div>
            <div className="university-section-heading">
              <div><span className="eyebrow">Official resources</span><h2>Useful links</h2></div>
            </div>
            {linkGroups.length ? (
              <div className="university-link-groups">
                {linkGroups.map((group) => (
                  <section key={group.title}>
                    <h3>{group.title}</h3>
                    <div className="university-link-list">
                      {group.links.map((link) => (
                        <a key={`${link.id}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                          <span>{link.label}</span><b aria-hidden="true">↗</b>
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="university-detail-empty is-compact">
                <h3>No official links available.</h3>
                <p>Reviewed public links have not been added yet.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="university-detail-cta">
        <div className="shell">
          <div><span>Ready for the next step?</span><h2>Build your application plan with SAC.</h2><p>Review your profile, documents, deadlines, and university options with clear guidance.</p></div>
          <Link className="button light-button" href="/contact">Talk to a counsellor</Link>
        </div>
      </section>
    </main>
  );
}
