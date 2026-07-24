import { load } from "cheerio";
import type { RawExtractedUniversity } from "../../types";
import { assertPageAccessible, withChromiumPage } from "../../browser";
import {
  getUniversityStudyDiscoveryContext,
  universityStudyListingUrl,
  type UniversityStudyDiscoveryEntry,
} from "./discover";

function pageName(html: string): string | null {
  const $ = load(html);
  const heading = $("h1").first().text().replace(/\s+/g, " ").trim();
  if (heading) return heading;
  const title = $("title").first().text().replace(/\s+/g, " ").replace(/\s+[|\-–—].*$/, "").trim();
  return title || null;
}

export function extractUniversityStudyHtml(
  html: string,
  officialWebsiteUrl: string,
  context: UniversityStudyDiscoveryEntry | null = null,
): RawExtractedUniversity {
  return {
    sourceUniversityUrl: universityStudyListingUrl,
    sourceExternalId: null,
    name: context?.name ?? pageName(html),
    country: context?.country ?? null,
    state: context?.stateOrRegion ?? null,
    city: null,
    address: null,
    institutionType: null,
    foundedYear: null,
    description: null,
    officialWebsiteUrl,
    logoUrl: null,
    bannerImageUrl: null,
    programs: [],
    admissionRequirements: [],
    tuition: [],
    scholarships: [],
    intakes: [],
    links: [
      { type: "source-listing", label: "University Study destinations", url: universityStudyListingUrl },
      { type: "official-website", label: "Official university website", url: officialWebsiteUrl },
    ],
  };
}

export async function extractUniversityStudy(officialWebsiteUrl: string): Promise<RawExtractedUniversity> {
  const context = getUniversityStudyDiscoveryContext(officialWebsiteUrl);
  return withChromiumPage(async (page) => {
    const response = await page.goto(officialWebsiteUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    const bodyText = await page.locator("body").innerText();
    assertPageAccessible(response?.status() ?? 0, bodyText);
    return extractUniversityStudyHtml(await page.content(), officialWebsiteUrl, context);
  });
}
