import { load } from "cheerio";
import { slugify } from "../../normalizers";
import { defaultClaimConfidence } from "../source-resolution";
import type {
  EnrichedProgram,
  EnrichmentClaim,
  OfficialPageSnapshot,
  ProgramDirectoryDiagnostics,
} from "../types";
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

export type ProgramLinkDiscovery = {
  entries: ProgramDirectoryEntry[];
  diagnostics: ProgramDirectoryDiagnostics[];
};

export const programCandidateLimitPerStudyLevel = 25;
export const selectedProgramLimitPerStudyLevel = 5;

const nonProgramText = /^(apply|admissions?|about|contact|directory|home|learn more|read more|view all|previous|next|search|menu|academic|academics|programs?|degrees?|majors?|undergraduate|graduate|bulletin|catalog)$/i;
const programUrlPattern = /\/(programs?|majors?|degrees?|academics?|graduate|undergraduate|curriculum|bulletin|catalog)(\/|$)/i;
const administrativePath = /\/(provost|administration|administrative|admissions?|apply|registrar|faculty|staff|departments?|colleges?|schools?)(\/|$)/i;
const nonDegreePath = /\/(minors?|certificates?|ugcertificates?|graduatecertificates?|concentrations?)(\/|$)/i;
const broadPath = /^(?:\/|\/academic|\/academics|\/undergraduate|\/graduate|\/majors?|\/programs?|\/degrees?|\/bulletin|\/catalog|\/undergraduate\/majors?|\/graduate\/degrees?|\/graduate\/programs?)\/?$/i;
const programContainerSelector = [
  "[data-program-link]",
  "a.program-link",
  ".program-card",
  ".degree-card",
  ".views-row",
  ".program-list",
  ".programs-list",
  ".list-group",
  ".az-list",
  "main article",
  "main li",
].join(",");

function increment(counts: Record<string, number>, reason: string) {
  counts[reason] = (counts[reason] ?? 0) + 1;
}

function inferredProgramType(name: string, url: string, explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const value = `${name} ${url}`;
  if (/\bminor\b/i.test(value)) return "minor";
  if (/\bcertificate\b/i.test(value)) return "certificate";
  if (/\bconcentration\b/i.test(value)) return "concentration";
  if (/\bmajor\b/i.test(value)) return "major";
  return "degree";
}

function canonicalProgramUrl(value: string): string {
  const url = new URL(value);
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+/g, "/").replace(/\/+$/, "") || "/";
  return url.toString();
}

function resemblesNamedAcademicProgram(name: string): boolean {
  const normalized = name.replace(/\s+/g, " ").trim();
  return normalized.length >= 3
    && normalized.length <= 180
    && /[a-z]{3}/i.test(normalized)
    && !nonProgramText.test(normalized)
    && !/\b(directory|all programs|all majors|academic programs|degree programs|colleges?|departments?|school of|office of|provost)\b/i.test(normalized);
}

export function discoverOfficialProgramLinksWithDiagnostics(
  pages: readonly OfficialPageSnapshot[],
  verifiedDomain: string,
): ProgramLinkDiscovery {
  const entries: ProgramDirectoryEntry[] = [];
  const seen = new Set<string>();
  const diagnostics: ProgramDirectoryDiagnostics[] = [];
  for (const page of pages) {
    const rejectionCounts: Record<string, number> = {};
    if (!page.html) {
      diagnostics.push({
        requestedUrl: page.url,
        finalUrl: page.finalUrl,
        pageKind: page.kind,
        status: page.status,
        accessIssue: page.accessIssue,
        candidateLinksBeforeFiltering: 0,
        acceptedLinksAfterFiltering: 0,
        acceptedByStudyLevel: {},
        acceptedCandidates: [],
        rejectedCandidates: [],
        rejectionCounts: { inaccessiblePage: 1 },
      });
      continue;
    }
    const $ = load(page.html);
    const candidates = $("a[href]").toArray().filter((element) => {
      const node = $(element);
      return node.is("[data-program-link], a.program-link")
        || node.closest(programContainerSelector).length > 0
        || programUrlPattern.test(node.attr("href") ?? "");
    });
    let acceptedForPage = 0;
    const acceptedByStudyLevel: Record<string, number> = {};
    const acceptedCandidates: ProgramDirectoryDiagnostics["acceptedCandidates"] = [];
    const rejectedCandidates: ProgramDirectoryDiagnostics["rejectedCandidates"] = [];
    for (const element of candidates) {
      const node = $(element);
      const explicitlyMarked = node.is("[data-program-link], a.program-link");
      const name = node.attr("data-program-name")?.trim() || node.text().replace(/\s+/g, " ").trim();
      const href = node.attr("href");
      if (!name || !href) {
        increment(rejectionCounts, "emptyNameOrHref");
        continue;
      }
      if (!resemblesNamedAcademicProgram(name)) {
        increment(rejectionCounts, "nonProgramText");
        if (rejectedCandidates.length < 100) rejectedCandidates.push({ name, url: href, reason: "nonProgramText" });
        continue;
      }
      let url: string;
      try {
        const parsed = new URL(href, page.finalUrl);
        parsed.hash = "";
        url = canonicalProgramUrl(parsed.toString());
      } catch {
        increment(rejectionCounts, "malformedUrl");
        continue;
      }
      if (!belongsToOfficialDomain(url, verifiedDomain)) {
        increment(rejectionCounts, "outsideOfficialDomain");
        continue;
      }
      const path = new URL(url).pathname;
      if (broadPath.test(path) || administrativePath.test(path)) {
        increment(rejectionCounts, "navigationOrDirectory");
        if (rejectedCandidates.length < 100) rejectedCandidates.push({ name, url, reason: "navigationOrDirectory" });
        continue;
      }
      if (!explicitlyMarked
        && !programUrlPattern.test(url)
        && node.closest(".program-card,.degree-card,.views-row,.program-list,.programs-list,.az-list").length === 0) {
        increment(rejectionCounts, "notProgramShaped");
        continue;
      }
      const studyLevel = node.attr("data-study-level")?.trim()
        || (page.kind === "program-directory-graduate" ? "graduate" : "undergraduate");
      const programType = inferredProgramType(name, url, node.attr("data-program-type"));
      if (!["degree", "major"].includes(programType.toLowerCase()) || nonDegreePath.test(path)) {
        increment(rejectionCounts, "nonDegreeProgramType");
        if (rejectedCandidates.length < 100) rejectedCandidates.push({ name, url, reason: "nonDegreeProgramType" });
        continue;
      }
      if (!explicitlyMarked && path.split("/").filter(Boolean).length < 3) {
        increment(rejectionCounts, "insufficientLeafDepth");
        continue;
      }
      const levelCount = entries.filter((entry) => entry.studyLevel === studyLevel).length;
      if (levelCount >= programCandidateLimitPerStudyLevel) {
        increment(rejectionCounts, "studyLevelAllocation");
        continue;
      }
      if (entries.length >= officialProgramLinkBudget) {
        increment(rejectionCounts, "globalLinkBudget");
        continue;
      }
      const key = `${studyLevel}|${canonicalProgramUrl(url)}`;
      if (seen.has(key)) {
        increment(rejectionCounts, "duplicate");
        continue;
      }
      seen.add(key);
      entries.push({ name, url, studyLevel, programType });
      acceptedForPage += 1;
      acceptedByStudyLevel[studyLevel] = (acceptedByStudyLevel[studyLevel] ?? 0) + 1;
      acceptedCandidates.push({ name, url, studyLevel, programType });
    }
    diagnostics.push({
      requestedUrl: page.url,
      finalUrl: page.finalUrl,
      pageKind: page.kind,
      status: page.status,
      accessIssue: page.accessIssue,
      candidateLinksBeforeFiltering: candidates.length,
      acceptedLinksAfterFiltering: acceptedForPage,
      acceptedByStudyLevel,
      acceptedCandidates,
      rejectedCandidates,
      rejectionCounts,
    });
  }
  return { entries, diagnostics };
}

export function discoverOfficialProgramLinks(
  pages: readonly OfficialPageSnapshot[],
  verifiedDomain: string,
): ProgramDirectoryEntry[] {
  return discoverOfficialProgramLinksWithDiagnostics(pages, verifiedDomain).entries;
}

function value($: ReturnType<typeof load>, field: string): string | null {
  return $(`[data-program-field="${field}"]`).first().text().replace(/\s+/g, " ").trim() || null;
}

function firstText($: ReturnType<typeof load>, selectors: string): string | null {
  return $(selectors).first().text().replace(/\s+/g, " ").trim() || null;
}

const headingNoise = new Set([
  "option", "track", "concentration", "degree", "program", "major",
  "bs", "ba", "bfa", "bba", "bed", "ma", "ms", "med", "meng", "mfa",
  "phd", "edd", "dvm", "of", "in", "the",
]);

function academicSubjectTokens(value: string): string[] {
  return value
    .normalize("NFKD")
    .replace(/[‐‑‒–—−-]/g, " ")
    .replace(/[()[\]{}:,;|/\\]/g, " ")
    .replace(/\b(?:B\.?\s*S\.?|B\.?\s*A\.?|M\.?\s*Ed\.?|M\.?\s*A\.?|M\.?\s*S\.?|Ph\.?\s*D\.?)\b/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token && !headingNoise.has(token));
}

export function academicProgramHeadingMatches(candidateName: string, heading: string): boolean {
  const candidate = academicSubjectTokens(candidateName);
  const finalHeading = academicSubjectTokens(heading);
  if (!candidate.length || !finalHeading.length) return false;
  const candidateSet = new Set(candidate);
  const headingSet = new Set(finalHeading);
  const candidateContained = candidate.filter((token) => headingSet.has(token)).length / candidate.length;
  const headingContained = finalHeading.filter((token) => candidateSet.has(token)).length / finalHeading.length;
  const minimumCandidateMatches = candidate.length === 1 ? 1 : Math.max(2, Math.ceil(candidate.length * 0.75));
  const matchingCandidateTokens = candidate.filter((token) => headingSet.has(token)).length;
  return matchingCandidateTokens >= minimumCandidateMatches
    && (candidateContained >= 0.75 || headingContained >= 0.75);
}

export type ProgramPageQualification = {
  qualified: boolean;
  heading: string | null;
  reason: string;
};

export function qualifyOfficialProgramPage(
  page: OfficialPageSnapshot,
  directoryEntry: ProgramDirectoryEntry,
): ProgramPageQualification {
  if (!page.html || page.status >= 400) {
    return { qualified: false, heading: null, reason: page.accessIssue ?? `HTTP ${page.status}` };
  }
  if (!["degree", "major"].includes(directoryEntry.programType.toLowerCase())) {
    return { qualified: false, heading: null, reason: "Candidate is not a degree or major program type." };
  }
  const $ = load(page.html);
  const heading = firstText($, "main h1, article h1, h1");
  const structured = $("[data-program-field='degree-level'], [data-program-field='award']").length > 0;
  const pageText = $("main").text().replace(/\s+/g, " ").trim() || $("body").text().replace(/\s+/g, " ").trim();
  const curriculumStructure = $([
    "table.curriculum",
    "table.course-requirements",
    ".curriculum table",
    ".course-requirements table",
    ".program-overview",
    ".degree-title",
    ".plan-of-study",
    ".required-courses",
    "[class*='plan-of-study']",
    "[class*='required-course']",
  ].join(",")).length > 0;
  const curriculumTable = $("table").toArray().some((table) => {
    const tableText = $(table).text().replace(/\s+/g, " ").trim();
    return /\b(course|requirements?|curriculum)\b/i.test(tableText)
      && /\b(hours?|credits?|total)\b/i.test(tableText);
  });
  const degreeEvidence = structured
    || curriculumStructure
    || curriculumTable
    || /\b(?:Bachelor(?:'s)?|Master(?:'s)?|Doctor(?:al|ate)?|Ph\.?D\.?|B\.?S\.?|B\.?A\.?|M\.?Ed\.?|M\.?S\.?|M\.?A\.?|MBA|degree title|degree requirements?|curriculum|course requirements?|required courses?|plan of study|program overview|total hours?|credit hours?)\b/i.test(pageText);
  const headingMatches = Boolean(
    structured && !heading
    || heading && academicProgramHeadingMatches(directoryEntry.name, heading),
  );
  if (!headingMatches) {
    return { qualified: false, heading, reason: "Final page heading does not match the candidate program name." };
  }
  if (!degreeEvidence) {
    return { qualified: false, heading, reason: "No explicit degree, curriculum, award, or credit evidence was found." };
  }
  return {
    qualified: true,
    heading,
    reason: structured
      ? "Matching program identity with explicit structured degree or award evidence."
      : "Matching page heading with explicit degree, curriculum, award, or credit evidence.",
  };
}

export function extractOfficialProgram(
  page: OfficialPageSnapshot,
  directoryEntry: ProgramDirectoryEntry,
): EnrichedProgram | null {
  if (!page.html || page.status >= 400) return null;
  if (!qualifyOfficialProgramPage(page, directoryEntry).qualified) return null;
  const $ = load(page.html);
  const name = value($, "name") ?? firstText($, "main h1, article h1, h1") ?? directoryEntry.name;
  const studyLevel = value($, "study-level") ?? directoryEntry.studyLevel;
  const programType = value($, "program-type") ?? directoryEntry.programType;
  const key = `${slugify(name)}-${slugify(studyLevel)}-${slugify(programType)}`;
  const stemText = value($, "stem");
  const isStem = stemText === null ? null : /^true|yes|stem$/i.test(stemText);
  const degreeLevel = value($, "degree-level") ?? firstText($, ".degree-level, .program-degree, [class*='degree-type']");
  const award = value($, "award") ?? firstText($, ".award, .credential");
  const department = value($, "department") ?? firstText($, ".department, .college, [class*='academic-unit']");
  const deliveryMode = value($, "delivery-mode") ?? firstText($, ".delivery-mode, [class*='delivery']");
  const campus = value($, "campus") ?? firstText($, ".campus, [class*='campus']");
  const durationText = value($, "duration") ?? firstText($, ".duration, [class*='duration']");
  const creditsText = value($, "credits") ?? firstText($, ".credits, [class*='credit']");
  const baseClaimValues: Array<[string, string | boolean | null]> = [
    ["name", name], ["studyLevel", studyLevel], ["programType", programType],
    ["degreeLevel", degreeLevel], ["award", award], ["department", department],
    ["deliveryMode", deliveryMode], ["campus", campus], ["durationText", durationText],
    ["creditsText", creditsText], ["isStem", isStem], ["officialProgramUrl", page.finalUrl],
  ];
  const baseClaims: EnrichmentClaim[] = baseClaimValues.flatMap(([fieldName, claimValue]) =>
    claimValue === null ? [] : [{
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
  }]);
  return {
    key,
    name,
    slug: slugify(`${name}-${studyLevel}-${programType}`),
    studyLevel,
    degreeLevel,
    award,
    programType,
    department,
    officialProgramUrl: page.finalUrl,
    deliveryMode,
    campus,
    durationText,
    creditsText,
    isStem,
    active: true,
    lastVerifiedAt: page.checkedAt,
    verificationStatus: "OFFICIAL_VERIFIED",
    claims: [...baseClaims, ...extractStructuredOfficialClaims(page, key, key)],
  };
}

export function limitProgramPages(entries: readonly ProgramDirectoryEntry[]): ProgramDirectoryEntry[] {
  const undergraduate = entries
    .filter((entry) => entry.studyLevel === "undergraduate")
    .slice(0, selectedProgramLimitPerStudyLevel);
  const graduate = entries
    .filter((entry) => entry.studyLevel === "graduate")
    .slice(0, selectedProgramLimitPerStudyLevel);
  return [...undergraduate, ...graduate].slice(0, officialProgramPageBudget);
}
