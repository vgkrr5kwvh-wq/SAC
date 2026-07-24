import { load } from "cheerio";
import type { RawExtractedUniversity } from "../../types";
import { assertPageAccessible } from "../../browser";

function firstText($: ReturnType<typeof load>, selectors: string): string | null {
  return $(selectors).first().text().replace(/\s+/g, " ").trim() || null;
}

export function extractStudiesOverseasHtml(html: string, sourceUniversityUrl: string): RawExtractedUniversity {
  const $ = load(html);
  const scholarshipSection = $('[data-section="scholarships"], #scholarships, .scholarship-section').first();
  const scholarshipText = scholarshipSection.text().replace(/\s+/g, " ").trim();
  return {
    sourceUniversityUrl,
    sourceExternalId: $("[data-university-id]").first().attr("data-university-id") ?? null,
    name: firstText($, "h1, [data-field='university-name']"),
    country: firstText($, "[data-field='country'], .country"),
    state: firstText($, "[data-field='state'], .state"),
    city: firstText($, "[data-field='city'], .city"),
    address: firstText($, "[data-field='address'], .address"),
    institutionType: firstText($, "[data-field='institution-type']"),
    foundedYear: firstText($, "[data-field='founded-year']"),
    description: firstText($, "[data-field='description'], .university-description"),
    officialWebsiteUrl: $("a[data-link='official-website'], a.official-website").first().attr("href") ?? null,
    logoUrl: $("[data-field='logo'], .university-logo img").first().attr("src") ?? null,
    bannerImageUrl: $("[data-field='banner'], .university-banner img").first().attr("src") ?? null,
    programs: $("[data-program], .course-card").toArray().map((element) => ({
      name: $(element).find("[data-field='program-name'], h3").first().text(),
      degreeLevel: $(element).find("[data-field='degree-level']").first().text(),
      subjectArea: $(element).find("[data-field='subject-area']").first().text(),
      durationText: $(element).find("[data-field='duration']").first().text(),
      creditsText: $(element).find("[data-field='credits']").first().text(),
      programUrl: $(element).find("a").first().attr("href") ?? null,
    })),
    scholarships: scholarshipSection.length ? [{
      name: scholarshipSection.find("[data-field='scholarship-name'], h3").first().text(),
      availabilityEvidence: scholarshipText || null,
      explicitlyUnavailable: scholarshipSection.attr("data-authoritative") === "true"
        && /no scholarships? (?:are )?available/i.test(scholarshipText),
      amountText: scholarshipSection.find("[data-field='amount']").first().text(),
      eligibilityText: scholarshipSection.find("[data-field='eligibility']").first().text(),
      minimumGpa: scholarshipSection.find("[data-field='minimum-gpa']").first().text(),
      isAutomatic: /automatic consideration/i.test(scholarshipText) ? true : null,
      requiresSeparateApplication: /separate application (?:is )?required/i.test(scholarshipText) ? true : null,
      isRenewable: /\brenewable\b/i.test(scholarshipText) ? true : null,
      renewalCriteria: scholarshipSection.find("[data-field='renewal-criteria']").first().text(),
      deadlineText: scholarshipSection.find("[data-field='deadline']").first().text(),
      scholarshipUrl: scholarshipSection.find("a").first().attr("href") ?? null,
    }] : [],
    links: [{ type: "source-profile", label: "Studies Overseas profile", url: sourceUniversityUrl }],
  };
}

export async function extractStudiesOverseas(sourceUniversityUrl: string): Promise<RawExtractedUniversity> {
  const response = await fetch(sourceUniversityUrl, {
    headers: { "user-agent": "SAC University Data Pilot/1.0 (authorized, low-volume)" },
    redirect: "follow",
  });
  const html = await response.text();
  assertPageAccessible(response.status, html);
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  return extractStudiesOverseasHtml(html, sourceUniversityUrl);
}
