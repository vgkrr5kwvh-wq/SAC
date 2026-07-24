import { load } from "cheerio";
import { slugify } from "../../normalizers";
import { defaultClaimConfidence } from "../source-resolution";
import type { EnrichedProgram, EnrichmentClaim, OfficialPageSnapshot } from "../types";
import {
  belongsToOfficialDomain,
  officialProgramLinkBudget,
  officialProgramPageBudget,
} from "../official-site";
import { extractStructuredOfficialClaims } from "./claims";

export type ProgramDirectoryEntry = {
  name: string;
  url: string;
  studyLevel: string;
  programType: string;
};

export function discoverOfficialProgramLinks(
  pages: readonly OfficialPageSnapshot[],
  verifiedDomain: string,
): ProgramDirectoryEntry[] {
  const entries: ProgramDirectoryEntry[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    if (!page.html) continue;
    const $ = load(page.html);
    $("[data-program-link], a.program-link").each((_index, element) => {
      if (entries.length >= officialProgramLinkBudget) return false;
      const node = $(element);
      const name = node.attr("data-program-name")?.trim() || node.text().replace(/\s+/g, " ").trim();
      const href = node.attr("href");
      if (!name || !href) return;
      let url: string;
      try { url = new URL(href, page.finalUrl).toString(); } catch { return; }
      if (!belongsToOfficialDomain(url, verifiedDomain)) return;
      const studyLevel = node.attr("data-study-level")?.trim()
        || (page.kind === "program-directory-graduate" ? "graduate" : "undergraduate");
      const programType = node.attr("data-program-type")?.trim() || "degree";
      const key = `${slugify(name)}|${studyLevel}|${programType}|${url}`;
      if (seen.has(key)) return;
      seen.add(key);
      entries.push({ name, url, studyLevel, programType });
    });
  }
  return entries;
}

function value($: ReturnType<typeof load>, field: string): string | null {
  return $(`[data-program-field="${field}"]`).first().text().replace(/\s+/g, " ").trim() || null;
}

export function extractOfficialProgram(
  page: OfficialPageSnapshot,
  directoryEntry: ProgramDirectoryEntry,
): EnrichedProgram | null {
  if (!page.html || page.status >= 400) return null;
  const $ = load(page.html);
  const name = value($, "name") ?? directoryEntry.name;
  const studyLevel = value($, "study-level") ?? directoryEntry.studyLevel;
  const programType = value($, "program-type") ?? directoryEntry.programType;
  const key = `${slugify(name)}-${slugify(studyLevel)}-${slugify(programType)}`;
  const stemText = value($, "stem");
  const isStem = stemText === null ? null : /^true|yes|stem$/i.test(stemText);
  const baseClaims: EnrichmentClaim[] = [
    ["name", name], ["studyLevel", studyLevel], ["programType", programType],
    ["officialProgramUrl", page.finalUrl],
  ].map(([fieldName, claimValue]) => ({
    entityType: "program",
    entityKey: key,
    programKey: key,
    fieldName,
    value: claimValue,
    normalizedValue: String(claimValue).toLowerCase(),
    sourceName: "official-university",
    sourceUrl: page.finalUrl,
    authorityLevel: "OFFICIAL_UNIVERSITY",
    confidence: defaultClaimConfidence.OFFICIAL_UNIVERSITY,
    observedAt: page.checkedAt,
    rawEvidenceText: null,
    scopeLabel: programType,
    studyLevel,
    entryRoute: "direct",
    academicYear: null,
  }));
  return {
    key,
    name,
    slug: slugify(`${name}-${studyLevel}-${programType}`),
    studyLevel,
    degreeLevel: value($, "degree-level"),
    award: value($, "award"),
    programType,
    department: value($, "department"),
    officialProgramUrl: page.finalUrl,
    deliveryMode: value($, "delivery-mode"),
    campus: value($, "campus"),
    durationText: value($, "duration"),
    creditsText: value($, "credits"),
    isStem,
    active: true,
    lastVerifiedAt: page.checkedAt,
    verificationStatus: "OFFICIAL_VERIFIED",
    claims: [...baseClaims, ...extractStructuredOfficialClaims(page, key, key)],
  };
}

export function limitProgramPages(entries: readonly ProgramDirectoryEntry[]): ProgramDirectoryEntry[] {
  return entries.slice(0, officialProgramPageBudget);
}

