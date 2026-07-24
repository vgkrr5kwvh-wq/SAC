import { load } from "cheerio";
import { normalizeLocation, normalizeUniversityName, officialDomain, safeUrl } from "../normalizers";
import { extractStudiesOverseasHtml } from "../sources/studies-overseas/extract";
import { mapStudiesOverseasUniversity } from "../sources/studies-overseas/map";
import { defaultClaimConfidence } from "./source-resolution";
import type { EnrichmentClaim, EnrichmentTarget, PartnerSourceMatch } from "./types";

export const studiesOverseasUsaCatalogUrl = "https://www.studies-overseas.com/universities/usa";

export function studiesOverseasCatalogProfiles(html: string): string[] {
  const $ = load(html);
  return [...new Set($("a[href]").toArray().flatMap((element) => {
    const href = $(element).attr("href");
    if (!href) return [];
    const url = safeUrl(href, studiesOverseasUsaCatalogUrl);
    return url && /studies-overseas\.com\/universities\/(?!usa\/?$)[^?#]+/i.test(url) ? [url] : [];
  }))];
}

function likelyCatalogProfiles(html: string, targetNames: ReadonlySet<string>): string[] {
  const $ = load(html);
  return [...new Set($("a[href]").toArray().flatMap((element) => {
    const href = $(element).attr("href");
    const label = $(element).text().replace(/\s+/g, " ").trim();
    if (!href || !label || !targetNames.has(normalizeUniversityName(label))) return [];
    const url = safeUrl(href, studiesOverseasUsaCatalogUrl);
    return url && /studies-overseas\.com\/universities\/(?!usa\/?$)[^?#]+/i.test(url) ? [url] : [];
  }))].slice(0, 5);
}

function partnerClaims(
  normalized: ReturnType<typeof mapStudiesOverseasUniversity>,
  observedAt: Date,
): EnrichmentClaim[] {
  const fields: Array<[string, unknown]> = [
    ["name", normalized.name],
    ["country", normalized.country],
    ["state", normalized.state],
    ["city", normalized.city],
    ["officialWebsiteUrl", normalized.officialWebsiteUrl],
  ];
  return fields.flatMap(([fieldName, value]) => value === null ? [] : [{
    entityType: "university" as const,
    entityKey: normalized.slug,
    programKey: null,
    fieldName,
    value,
    normalizedValue: String(value).toLowerCase(),
    sourceName: "studies-overseas",
    sourceUrl: normalized.sourceUniversityUrl,
    authorityLevel: "STUDIES_OVERSEAS" as const,
    confidence: defaultClaimConfidence.STUDIES_OVERSEAS,
    observedAt,
    rawEvidenceText: null,
    scopeLabel: null,
    studyLevel: null,
    entryRoute: null,
    academicYear: null,
  }]);
}

export async function matchStudiesOverseasSource(
  target: EnrichmentTarget,
  catalogHtml: string,
  fetchProfile: (url: string) => Promise<string>,
  observedAt = new Date(),
): Promise<PartnerSourceMatch> {
  const targetName = normalizeUniversityName(target.name);
  const targetDomain = officialDomain(target.officialWebsiteUrl);
  const targetNames = new Set([targetName, ...target.aliases.map(normalizeUniversityName)]);
  const profiles = likelyCatalogProfiles(catalogHtml, targetNames);
  const strong: Array<{
    url: string;
    raw: ReturnType<typeof extractStudiesOverseasHtml>;
    normalized: ReturnType<typeof mapStudiesOverseasUniversity>;
    reason: string;
  }> = [];
  const uncertain: typeof strong = [];

  for (const profileUrl of profiles) {
    const raw = extractStudiesOverseasHtml(await fetchProfile(profileUrl), profileUrl);
    const normalized = mapStudiesOverseasUniversity(raw);
    const candidateDomain = officialDomain(normalized.officialWebsiteUrl);
    const nameMatches = targetNames.has(normalizeUniversityName(normalized.name));
    const cityMatches = Boolean(target.city && normalizeLocation(target.city) === normalizeLocation(normalized.city));
    const stateMatches = Boolean(target.state && normalizeLocation(target.state) === normalizeLocation(normalized.state));
    const domainMatches = Boolean(targetDomain && candidateDomain && targetDomain === candidateDomain);
    const domainConflicts = Boolean(targetDomain && candidateDomain && targetDomain !== candidateDomain);
    if (domainMatches || nameMatches && (cityMatches || stateMatches) && !domainConflicts) {
      strong.push({ url: profileUrl, raw, normalized, reason: domainMatches ? "Verified official domain match." : "Exact normalized name and location match." });
    } else if (nameMatches || domainMatches) {
      uncertain.push({ url: profileUrl, raw, normalized, reason: "Partial source evidence requires manual review." });
    }
  }
  if (strong.length === 1) {
    const match = strong[0];
    return {
      status: "MATCHED",
      profileUrl: match.url,
      reason: match.reason,
      rawPayload: match.raw,
      normalizedPayload: match.normalized,
      claims: partnerClaims(match.normalized, observedAt),
    };
  }
  const candidate = strong[0] ?? uncertain[0];
  if (candidate) {
    return {
      status: "MANUAL_REVIEW",
      profileUrl: candidate.url,
      reason: strong.length > 1 ? "Multiple conservative matches were found." : candidate.reason,
      rawPayload: candidate.raw,
      normalizedPayload: candidate.normalized,
      claims: partnerClaims(candidate.normalized, observedAt),
    };
  }
  return {
    status: "NOT_FOUND",
    profileUrl: null,
    reason: "No conservative Studies Overseas match was found.",
    rawPayload: null,
    normalizedPayload: null,
    claims: [],
  };
}
