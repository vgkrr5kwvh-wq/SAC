import { load } from "cheerio";
import { assertPageAccessible, conservativeDelay, withChromiumPage } from "../../browser";

export const universityStudyListingUrl = "https://universitystudy.com/study-destinations/";

export type UniversityStudyDiscoveryEntry = {
  name: string;
  officialWebsiteUrl: string;
  stateOrRegion: string;
  country: string;
  sourceListingUrl: typeof universityStudyListingUrl;
};

const usSections = new Set([
  "ALABAMA", "ALASKA", "ARIZONA", "ARKANSAS", "CALIFORNIA", "COLORADO", "CONNECTICUT",
  "DELAWARE", "DISTRICT OF COLUMBIA", "FLORIDA", "GEORGIA", "HAWAII", "IDAHO", "ILLINOIS",
  "INDIANA", "IOWA", "KANSAS", "KENTUCKY", "LOUISIANA", "MAINE", "MARYLAND", "MASSACHUSETTS",
  "MICHIGAN", "MINNESOTA", "MISSISSIPPI", "MISSOURI", "MONTANA", "NEBRASKA", "NEVADA",
  "NEW HAMPSHIRE", "NEW JERSEY", "NEW MEXICO", "NEW YORK", "NORTH CAROLINA", "NORTH DAKOTA",
  "OHIO", "OKLAHOMA", "OREGON", "PENNSYLVANIA", "RHODE ISLAND", "SOUTH CAROLINA",
  "SOUTH DAKOTA", "TENNESSEE", "TEXAS", "UTAH", "VERMONT", "VIRGINIA", "WASHINGTON",
  "WEST VIRGINIA", "WISCONSIN", "WYOMING", "MIDWEST", "NORTHEAST", "SOUTHEAST", "SOUTHWEST",
  "WEST", "PACIFIC", "NEW ENGLAND",
]);
const excludedText = /\b(contact|news|article|blog|login|log in|sign in|privacy|terms|about us|home|apply now)\b/i;
const excludedPath = /\/(?:contact|news|article|blog|login|sign-in|privacy|terms)(?:\/|$)/i;
const explicitStudyVariant = /\b(graduate|undergraduate)\b/i;
const discoveryContext = new Map<string, UniversityStudyDiscoveryEntry>();

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function canonicalExternalUrl(value: string): string | null {
  if (/^(?:#|javascript:|mailto:)/i.test(value) || /https?:\/\/(?:www\.)?https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value, universityStudyListingUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.hash === "#" || url.hostname === "universitystudy.com" || url.hostname.endsWith(".universitystudy.com")) return null;
    if (/^(?:www\.)?google\./i.test(url.hostname) || url.hostname.includes(".google.")) return null;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname)) return null;
    if (excludedPath.test(url.pathname)) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizedEntryName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizedOfficialDomain(value: string): string {
  return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
}

function normalizedSectionLabel(value: string): string | null {
  const normalized = clean(value)
    .toUpperCase()
    .replace(/\s*\(\s*CONTINUED\s*\)\s*$/, "")
    .trim();
  return normalized === "INTERNATIONAL" || usSections.has(normalized) ? normalized : null;
}

function internationalNameAndCountry(label: string): { name: string; country: string } | null {
  const match = label.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!match) return null;
  const name = clean(match[1]);
  const country = clean(match[2]);
  return name && country ? { name, country } : null;
}

export function parseUniversityStudyDestinationsHtml(html: string): UniversityStudyDiscoveryEntry[] {
  const $ = load(html);
  const entries: UniversityStudyDiscoveryEntry[] = [];

  $(".col-sm-6").each((_columnIndex, columnElement) => {
    const column = $(columnElement);
    const hasLocationLabel = column.find("b").toArray().some((element) =>
      normalizedSectionLabel($(element).text()) !== null
    );
    if (!hasLocationLabel || column.closest("nav,header,footer,[role='navigation'],[data-exclude-university-list]").length) return;

    let section: string | null = null;
    column.contents().each((_nodeIndex, childNode) => {
      if (childNode.type !== "tag") return;
      const node = $(childNode);
      const tagName = childNode.tagName.toLowerCase();
      if (tagName === "b") {
        const location = normalizedSectionLabel(node.text());
        section = location;
        return;
      }
      if (tagName !== "a" || !section) return;
      const label = clean(node.text());
      if (!label || excludedText.test(label) || label.length < 3) return;
      const rawHref = node.attr("href")?.trim();
      if (!rawHref) return;
      const officialWebsiteUrl = canonicalExternalUrl(rawHref);
      if (!officialWebsiteUrl) return;

      const international = section === "INTERNATIONAL" ? internationalNameAndCountry(label) : null;
      if (section === "INTERNATIONAL" && !international) return;
      const name = international?.name ?? label;
      const normalizedName = normalizedEntryName(name);
      if (!normalizedName) return;
      const entry: UniversityStudyDiscoveryEntry = {
        name,
        officialWebsiteUrl,
        stateOrRegion: section,
        country: international?.country ?? "USA",
        sourceListingUrl: universityStudyListingUrl,
      };
      entries.push(entry);
    });
  });
  return entries;
}

export function filterUniversityStudyEntries(
  entries: readonly UniversityStudyDiscoveryEntry[],
  country = "USA",
): UniversityStudyDiscoveryEntry[] {
  const normalizedCountry = clean(country).toUpperCase();
  const filtered = entries.filter((entry) => clean(entry.country).toUpperCase() === normalizedCountry);
  const selected: UniversityStudyDiscoveryEntry[] = [];
  const exactKeys = new Set<string>();
  const baseEntries = new Map<string, UniversityStudyDiscoveryEntry[]>();
  for (const entry of filtered) {
    const normalizedName = normalizedEntryName(entry.name);
    const domain = normalizedOfficialDomain(entry.officialWebsiteUrl);
    const section = entry.stateOrRegion.toUpperCase();
    const exactKey = `${normalizedName}|${domain}|${section}`;
    if (exactKeys.has(exactKey)) continue;
    const baseName = normalizedName.replace(/\b(?:graduate|undergraduate)\b/g, "").replace(/\s+/g, " ").trim();
    const baseKey = `${baseName}|${domain}|${section}`;
    const prior = baseEntries.get(baseKey) ?? [];
    const hasDistinctStudyVariant = prior.length > 0
      && explicitStudyVariant.test(entry.name)
      && prior.every((candidate) =>
        explicitStudyVariant.test(candidate.name)
        && normalizedEntryName(candidate.name) !== normalizedName
      );
    if (prior.length > 0 && !hasDistinctStudyVariant) continue;
    exactKeys.add(exactKey);
    prior.push(entry);
    baseEntries.set(baseKey, prior);
    selected.push(entry);
  }
  return selected;
}

export function getUniversityStudyDiscoveryContext(officialWebsiteUrl: string): UniversityStudyDiscoveryEntry | null {
  return discoveryContext.get(officialWebsiteUrl) ?? null;
}

export async function discoverUniversityStudyUrls(options: {
  limit?: number;
  country?: string | null;
  maxAttempts?: number;
} = {}): Promise<string[]> {
  const limit = Math.min(options.limit ?? 5, 5);
  const maximumAttempts = Math.min(options.maxAttempts ?? limit * 2, limit * 2, 10);
  return withChromiumPage(async (page) => {
    const response = await page.goto(universityStudyListingUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const bodyText = await page.locator("body").innerText();
    assertPageAccessible(response?.status() ?? 0, bodyText);
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    const renderedHtml = await page.content();
    const entries = filterUniversityStudyEntries(
      parseUniversityStudyDestinationsHtml(renderedHtml),
      options.country ?? "USA",
    ).slice(0, maximumAttempts);
    discoveryContext.clear();
    for (const entry of entries) discoveryContext.set(entry.officialWebsiteUrl, entry);
    await conservativeDelay();
    return entries.map((entry) => entry.officialWebsiteUrl);
  });
}
