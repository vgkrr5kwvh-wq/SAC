import { load } from "cheerio";
import { conservativeDelay, withChromiumPage } from "../browser";
import { classifyOfficialLink } from "./page-classification";
import type {
  OfficialPageCandidate,
  OfficialPageKind,
  OfficialPageSnapshot,
} from "./types";

export const officialGeneralPageBudget = 8;
export const officialProgramDirectoryBudget = 2;
export const officialProgramLinkBudget = 50;
export const officialProgramPageBudget = 10;

export function normalizedHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function belongsToOfficialDomain(candidateUrl: string, verifiedDomain: string): boolean {
  const hostname = normalizedHostname(candidateUrl);
  const normalizedDomain = verifiedDomain.toLowerCase().replace(/^www\./, "");
  return Boolean(hostname && (hostname === normalizedDomain || hostname.endsWith(`.${normalizedDomain}`)));
}

export function validateOfficialRedirect(
  requestedUrl: string,
  finalUrl: string,
  verifiedDomain: string,
): { valid: boolean; reason: string | null } {
  if (!belongsToOfficialDomain(requestedUrl, verifiedDomain)) {
    return { valid: false, reason: "Requested URL is outside the verified official domain." };
  }
  if (!belongsToOfficialDomain(finalUrl, verifiedDomain)) {
    return { valid: false, reason: "Redirect left the verified official domain." };
  }
  return { valid: true, reason: null };
}

function canonicalSameDomainUrl(href: string, baseUrl: string, verifiedDomain: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    if (!["http:", "https:"].includes(url.protocol) || !belongsToOfficialDomain(url.toString(), verifiedDomain)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function discoverApprovedOfficialPages(
  homepageHtml: string,
  homepageUrl: string,
  verifiedDomain: string,
): { general: OfficialPageCandidate[]; programDirectories: OfficialPageCandidate[] } {
  const $ = load(homepageHtml);
  const general: OfficialPageCandidate[] = [{ url: homepageUrl, label: "Homepage", kind: "homepage" }];
  const programDirectories: OfficialPageCandidate[] = [];
  const seen = new Set([homepageUrl]);
  $("a[href]").each((_index, element) => {
    const label = $(element).text().replace(/\s+/g, " ").trim();
    const href = $(element).attr("href");
    if (!href || !label) return;
    const url = canonicalSameDomainUrl(href, homepageUrl, verifiedDomain);
    if (!url || seen.has(url)) return;
    const kind = classifyOfficialLink(label, url);
    if (!kind) return;
    seen.add(url);
    const candidate = { url, label, kind };
    if (kind === "program-directory-undergraduate" || kind === "program-directory-graduate") {
      if (programDirectories.length < officialProgramDirectoryBudget) programDirectories.push(candidate);
    } else if (general.length < officialGeneralPageBudget) {
      general.push(candidate);
    }
  });
  return { general, programDirectories };
}

export function robotsDisallows(robotsText: string, targetUrl: string): boolean {
  const path = new URL(targetUrl).pathname;
  let applies = false;
  for (const rawLine of robotsText.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key?.trim().toLowerCase() === "user-agent") applies = value === "*";
    if (applies && key?.trim().toLowerCase() === "disallow" && value && path.startsWith(value)) return true;
  }
  return false;
}

export type OfficialPageFetcher = (candidate: OfficialPageCandidate) => Promise<OfficialPageSnapshot>;

export async function crawlOfficialPages(
  candidates: readonly OfficialPageCandidate[],
  fetcher: OfficialPageFetcher,
  budget: number,
  delay: () => Promise<void> = conservativeDelay,
): Promise<OfficialPageSnapshot[]> {
  const pages: OfficialPageSnapshot[] = [];
  for (const candidate of candidates.slice(0, budget)) {
    pages.push(await fetcher(candidate));
    if (pages.length < Math.min(candidates.length, budget)) await delay();
  }
  return pages;
}

export async function fetchOfficialPagesWithPlaywright(
  candidates: readonly OfficialPageCandidate[],
  verifiedDomain: string,
  budget: number,
): Promise<OfficialPageSnapshot[]> {
  return withChromiumPage(async (page) => {
    const snapshots: OfficialPageSnapshot[] = [];
    for (const candidate of candidates.slice(0, budget)) {
      const checkedAt = new Date();
      try {
        const response = await page.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        const status = response?.status() ?? 0;
        const finalUrl = page.url();
        const redirect = validateOfficialRedirect(candidate.url, finalUrl, verifiedDomain);
        const bodyText = await page.locator("body").innerText().catch(() => "");
        const blocked = status === 401 || status === 403 || status === 429
          || /captcha|verify you are human|access denied|authentication required/i.test(bodyText);
        snapshots.push({
          ...candidate,
          finalUrl,
          status,
          html: redirect.valid && !blocked ? await page.content() : null,
          accessIssue: !redirect.valid ? redirect.reason : blocked ? `Official page access stopped with HTTP ${status || "blocked"}.` : null,
          checkedAt,
        });
      } catch (error) {
        snapshots.push({
          ...candidate,
          finalUrl: candidate.url,
          status: 0,
          html: null,
          accessIssue: error instanceof Error ? error.message : "Official page request failed.",
          checkedAt,
        });
      }
      if (snapshots.length < Math.min(candidates.length, budget)) await conservativeDelay();
    }
    return snapshots;
  });
}

export function officialPageKindScope(kind: OfficialPageKind): {
  studyLevel: string | null;
  entryRoute: string;
} {
  if (kind === "undergraduate-admissions" || kind === "program-directory-undergraduate") return { studyLevel: "undergraduate", entryRoute: "direct" };
  if (kind === "graduate-admissions" || kind === "program-directory-graduate") return { studyLevel: "graduate", entryRoute: "direct" };
  if (kind === "pathway") return { studyLevel: null, entryRoute: "pathway" };
  return { studyLevel: null, entryRoute: "direct" };
}
