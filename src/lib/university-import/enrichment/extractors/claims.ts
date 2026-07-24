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
  return claims;
}

