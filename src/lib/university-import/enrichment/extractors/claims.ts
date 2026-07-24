import { load } from "cheerio";
import { defaultClaimConfidence } from "../source-resolution";
import type { EnrichmentClaim, OfficialPageSnapshot } from "../types";
import { officialPageKindScope } from "../official-site";

function parseValue(value: string, type: string | undefined): unknown {
  if (type === "number") {
    const number = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(number) ? number : value;
  }
  if (type === "boolean") return value.toLowerCase() === "true";
  if (type === "json") {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

export function extractStructuredOfficialClaims(
  page: OfficialPageSnapshot,
  universityKey: string,
  programKey: string | null = null,
): EnrichmentClaim[] {
  if (!page.html) return [];
  const $ = load(page.html);
  const pageScope = officialPageKindScope(page.kind);
  const pathway = page.kind === "pathway";
  const authorityLevel = pathway ? "PATHWAY_PROVIDER" : "OFFICIAL_UNIVERSITY";
  const claims: EnrichmentClaim[] = [];
  $("[data-claim-field]").each((_index, element) => {
    const node = $(element);
    const fieldName = node.attr("data-claim-field")?.trim();
    const rawValue = node.attr("data-claim-value") ?? node.text().replace(/\s+/g, " ").trim();
    if (!fieldName || !rawValue) return;
    const studyLevel = node.attr("data-study-level")?.trim() || pageScope.studyLevel;
    const entryRoute = node.attr("data-entry-route")?.trim() || pageScope.entryRoute;
    claims.push({
      entityType: (node.attr("data-entity-type") as EnrichmentClaim["entityType"]) || (programKey ? "program" : "university"),
      entityKey: node.attr("data-entity-key")?.trim() || programKey || universityKey,
      programKey,
      fieldName,
      value: parseValue(rawValue, node.attr("data-value-type")),
      normalizedValue: rawValue.toLowerCase().replace(/\s+/g, " ").trim(),
      sourceName: pathway ? "pathway-provider" : "official-university",
      sourceUrl: page.finalUrl,
      authorityLevel,
      confidence: defaultClaimConfidence[authorityLevel],
      observedAt: page.checkedAt,
      rawEvidenceText: node.text().replace(/\s+/g, " ").trim() || null,
      scopeLabel: node.attr("data-scope")?.trim() || null,
      studyLevel,
      entryRoute,
      academicYear: node.attr("data-academic-year")?.trim() || null,
    });
  });
  const contentHtml = $("main").first().html() ?? $("body").html() ?? "";
  const text = load(`<div>${contentHtml.replace(/<[^>]+>/g, " ")}</div>`)("div")
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const existing = new Set(claims.map((claim) => claim.fieldName));
  const addTextClaim = (
    entityType: EnrichmentClaim["entityType"],
    fieldName: string,
    match: RegExpMatchArray | null,
    value: unknown,
    rawEvidenceText: string,
    academicYear: string | null = null,
  ) => {
    if (!match || existing.has(fieldName)) return;
    claims.push({
      entityType,
      entityKey: programKey || universityKey,
      programKey,
      fieldName,
      value,
      normalizedValue: String(value).toLowerCase().replace(/\s+/g, " ").trim(),
      sourceName: pathway ? "pathway-provider" : "official-university",
      sourceUrl: page.finalUrl,
      authorityLevel,
      confidence: defaultClaimConfidence[authorityLevel],
      observedAt: page.checkedAt,
      rawEvidenceText: rawEvidenceText.slice(0, 500),
      scopeLabel: page.kind,
      studyLevel: pageScope.studyLevel,
      entryRoute: pageScope.entryRoute,
      academicYear,
    });
    existing.add(fieldName);
  };
  if (text) {
    const gpa = text.match(/\b(?:minimum|required)\s+GPA(?:\s+(?:of|is))?\s*:?\s*([0-4](?:\.\d{1,2})?)/i);
    addTextClaim("admission-requirement", "minimumGpa", gpa, gpa ? Number(gpa[1]) : null, gpa?.[0] ?? "");
    for (const [fieldName, pattern] of [
      ["ieltsOverall", /\bIELTS(?:\s+overall)?(?:\s+score)?(?:\s+(?:of|is))?\s*:?\s*(\d(?:\.\d)?)/i],
      ["toeflOverall", /\bTOEFL(?:\s+iBT)?(?:\s+overall)?(?:\s+score)?(?:\s+(?:of|is))?\s*:?\s*(\d{2,3})/i],
      ["pteOverall", /\bPTE(?:\s+Academic)?(?:\s+overall)?(?:\s+score)?(?:\s+(?:of|is))?\s*:?\s*(\d{2,3})/i],
      ["duolingoOverall", /\bDuolingo(?:\s+English Test)?(?:\s+overall)?(?:\s+score)?(?:\s+(?:of|is))?\s*:?\s*(\d{2,3})/i],
    ] as const) {
      const match = text.match(pattern);
      addTextClaim("admission-requirement", fieldName, match, match ? Number(match[1]) : null, match?.[0] ?? "");
    }
    if (page.kind === "tuition") {
      const amount = text.match(/\b(?:tuition|estimated tuition)\b[^$]{0,80}\$\s*([\d,]+(?:\.\d{2})?)/i);
      const year = text.match(/\b(20\d{2}\s*[-–/]\s*(?:20)?\d{2})\b/);
      addTextClaim("tuition", "amount", amount, amount ? Number(amount[1].replaceAll(",", "")) : null, amount?.[0] ?? "", year?.[1].replace(/\s+/g, "") ?? null);
      addTextClaim("tuition", "currency", amount, "USD", amount?.[0] ?? "", year?.[1].replace(/\s+/g, "") ?? null);
    }
    if (page.kind === "scholarships") {
      const evidence = text.match(/\b(?:scholarships?|financial aid)\b.{0,180}\b(?:available|awarded|eligible|opportunities)\b/i);
      addTextClaim("scholarship", "scholarshipAvailable", evidence, true, evidence?.[0] ?? "");
    }
    if (page.kind === "application-requirements" || page.kind === "international-admissions") {
      const deadline = text.match(/\b(?:application|priority|scholarship)\s+deadline\b\s*:?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+20\d{2})?)/i);
      addTextClaim("intake", "deadline", deadline, deadline?.[1] ?? null, deadline?.[0] ?? "");
    }
  }
  return claims;
}
