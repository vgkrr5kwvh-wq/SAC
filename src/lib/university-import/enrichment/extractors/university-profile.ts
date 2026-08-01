import { load, type CheerioAPI } from "cheerio";
import { defaultClaimConfidence } from "../source-resolution";
import {
  belongsToOfficialDomain,
  canonicalOfficialUrlIdentity,
} from "../official-site";
import type { EnrichmentClaim, OfficialPageSnapshot } from "../types";
import { universityDisplayName } from "@/lib/university-intelligence/university-name";

type OfficialFact = {
  fieldName: string;
  value: unknown;
  evidence: string | null;
};

const marketingLanguage = /\b(world[- ]class|best[- ]in[- ]class|leading|premier|prestigious|vibrant|exceptional|transformative|unparalleled|discover your|join us)\b/i;
const factualDescriptionLanguage = /\b(university|college|institution|campus|founded|established|located|public|private|enroll|student|degree|research)\b/i;

function compact(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function words(value: string): string {
  return value.split(/\s+/).slice(0, 100).join(" ");
}

export function conciseFactualDescription(value: string | null | undefined): string | null {
  const text = compact(value);
  if (!text || !factualDescriptionLanguage.test(text)) return null;
  const factualSentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => factualDescriptionLanguage.test(sentence) && !marketingLanguage.test(sentence));
  const description = words(factualSentences.join(" "));
  return description || null;
}

function officialHttpsUrl(
  value: string | null | undefined,
  baseUrl: string,
  verifiedDomain: string,
): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== "https:" || !belongsToOfficialDomain(url.toString(), verifiedDomain)) return null;
    return canonicalOfficialUrlIdentity(url.toString());
  } catch {
    return null;
  }
}

function jsonLdObjects($: CheerioAPI): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      const parsed = JSON.parse($(element).text()) as unknown;
      const values = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])
          ? (parsed as { "@graph": unknown[] })["@graph"]
          : [parsed];
      for (const value of values) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          objects.push(value as Record<string, unknown>);
        }
      }
    } catch {
      // Invalid structured data is ignored; it is never repaired or guessed.
    }
  });
  return objects;
}

function organizationObject($: CheerioAPI): Record<string, unknown> | null {
  return jsonLdObjects($).find((object) => {
    const type = object["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some((value) =>
      typeof value === "string"
      && /^(CollegeOrUniversity|EducationalOrganization|Organization)$/i.test(value)
    );
  }) ?? null;
}

function addressText(value: unknown): string | null {
  if (typeof value === "string") return compact(value) || null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const address = value as Record<string, unknown>;
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry,
  ].filter((part): part is string => typeof part === "string" && Boolean(compact(part)));
  return parts.length ? parts.map(compact).join(", ") : null;
}

function labelledFact($: CheerioAPI, labels: RegExp): { value: string; evidence: string } | null {
  for (const element of $("dt, th, [class*='label'], strong, b").toArray()) {
    const label = compact($(element).text());
    if (!labels.test(label)) continue;
    const sibling = $(element).is("dt")
      ? $(element).next("dd")
      : $(element).is("th")
        ? $(element).next("td")
        : $(element).next();
    const value = compact(sibling.text());
    if (value) return { value, evidence: `${label}: ${value}` };
  }
  return null;
}

function yearValue(value: unknown): number | null {
  const match = String(value ?? "").match(/\b(1[6-9]\d{2}|20[0-2]\d)\b/);
  return match ? Number(match[1]) : null;
}

export function extractOfficialUniversityProfileClaims(
  page: OfficialPageSnapshot,
  universityKey: string,
  verifiedDomain: string,
): EnrichmentClaim[] {
  if (!page.html || page.status >= 400 || page.kind !== "homepage") return [];
  const $ = load(page.html);
  const organization = organizationObject($);
  const address = addressText(organization?.address)
    || compact($("address").first().text())
    || null;
  const city = typeof organization?.address === "object" && organization.address
    ? compact(String((organization.address as Record<string, unknown>).addressLocality ?? ""))
    : "";
  const institutionType = labelledFact($, /^(institution|school)\s+type$/i);
  const campusType = labelledFact($, /^campus\s+type$/i);
  const universitySize = labelledFact($, /^(university|institution|student body|enrollment)\s+size$/i);
  const internationalStudents = labelledFact($, /^international students?(?: information| enrollment)?$/i);
  const description = conciseFactualDescription(
    typeof organization?.description === "string"
      ? organization.description
      : $("meta[name='description']").attr("content"),
  );
  const logoCandidate = typeof organization?.logo === "string"
    ? organization.logo
    : typeof organization?.logo === "object" && organization.logo
      ? String((organization.logo as Record<string, unknown>).url ?? "")
      : $("img[class*='logo'], header img[alt*='logo' i]").first().attr("src");
  const explicitBanner = $("[data-university-banner]").first().attr("data-university-banner")
    ?? $("meta[name='university:banner']").attr("content");
  const finalWebsite = officialHttpsUrl(page.finalUrl, page.finalUrl, verifiedDomain);
  const facts: OfficialFact[] = [
    { fieldName: "officialName", value: universityDisplayName(typeof organization?.name === "string" ? compact(organization.name) : compact($("h1").first().text())), evidence: null },
    { fieldName: "officialWebsiteUrl", value: finalWebsite, evidence: page.finalUrl },
    { fieldName: "city", value: city || null, evidence: address },
    { fieldName: "address", value: address, evidence: address },
    { fieldName: "institutionType", value: institutionType?.value ?? null, evidence: institutionType?.evidence ?? null },
    { fieldName: "foundedYear", value: yearValue(organization?.foundingDate) ?? yearValue(labelledFact($, /^(founded|established)$/i)?.value), evidence: null },
    { fieldName: "description", value: description, evidence: description },
    { fieldName: "logoUrl", value: officialHttpsUrl(logoCandidate, page.finalUrl, verifiedDomain), evidence: logoCandidate ?? null },
    { fieldName: "bannerImageUrl", value: officialHttpsUrl(explicitBanner, page.finalUrl, verifiedDomain), evidence: explicitBanner ?? null },
    { fieldName: "campusType", value: campusType?.value ?? null, evidence: campusType?.evidence ?? null },
    { fieldName: "universitySize", value: universitySize?.value ?? null, evidence: universitySize?.evidence ?? null },
    { fieldName: "internationalStudentInformation", value: internationalStudents?.value ?? null, evidence: internationalStudents?.evidence ?? null },
  ];
  return facts.flatMap((fact) => fact.value === null || fact.value === "" ? [] : [{
    entityType: "university" as const,
    entityKey: universityKey,
    programKey: null,
    fieldName: fact.fieldName,
    value: fact.value,
    normalizedValue: String(fact.value).toLowerCase().replace(/\s+/g, " ").trim(),
    sourceName: "official-university",
    sourceUrl: page.finalUrl,
    authorityLevel: "OFFICIAL_UNIVERSITY" as const,
    confidence: defaultClaimConfidence.OFFICIAL_UNIVERSITY,
    observedAt: page.checkedAt,
    rawEvidenceText: fact.evidence?.slice(0, 500) ?? null,
    scopeLabel: "official-university-profile",
    studyLevel: null,
    entryRoute: "direct",
    academicYear: null,
  }]);
}
