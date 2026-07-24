import assert from "node:assert/strict";
import test from "node:test";
import {
  nextVerificationStatus,
  preferredClaimForProgram,
  resolveSourceClaims,
} from "../src/lib/university-import/enrichment/source-resolution";
import type { EnrichmentClaim } from "../src/lib/university-import/enrichment/types";

function claim(overrides: Partial<EnrichmentClaim> = {}): EnrichmentClaim {
  return {
    entityType: "admission-requirement",
    entityKey: "auburn",
    programKey: null,
    fieldName: "ieltsOverall",
    value: 6.5,
    normalizedValue: "6.5",
    sourceName: "official-university",
    sourceUrl: "https://auburn.edu/admissions",
    authorityLevel: "OFFICIAL_UNIVERSITY",
    confidence: 95,
    observedAt: new Date("2026-07-25T00:00:00Z"),
    rawEvidenceText: "IELTS 6.5",
    scopeLabel: null,
    studyLevel: "undergraduate",
    entryRoute: "direct",
    academicYear: null,
    ...overrides,
  };
}

test("official factual claims beat conflicting partner claims regardless of confidence", () => {
  const official = claim();
  const partner = claim({
    value: 6,
    normalizedValue: "6",
    sourceName: "studies-overseas",
    sourceUrl: "https://studies-overseas.com/auburn",
    authorityLevel: "STUDIES_OVERSEAS",
    confidence: 100,
  });
  const result = resolveSourceClaims([partner, official])[0];
  assert.equal(result.preferred.sourceName, "official-university");
  assert.equal(result.conflictStatus, "CONFLICT_REVIEW");
  assert.equal(result.competing[0].value, 6);
});

test("manual verification remains locked against later automated claims", () => {
  const manual = claim({ value: 7, normalizedValue: "7", authorityLevel: "MANUAL_VERIFIED", sourceName: "manual-review", confidence: 100 });
  const result = resolveSourceClaims([claim(), manual])[0];
  assert.equal(result.preferred.authorityLevel, "MANUAL_VERIFIED");
  assert.equal(result.conflictStatus, "MANUAL_LOCKED");
});

test("different academic years and direct/pathway scopes never overwrite each other", () => {
  const direct = claim({ academicYear: "2026-27" });
  const priorYear = claim({ value: 34000, normalizedValue: "34000", fieldName: "amount", entityType: "tuition", academicYear: "2025-26" });
  const pathway = claim({ value: 5.5, normalizedValue: "5.5", authorityLevel: "PATHWAY_PROVIDER", sourceName: "auburn-global", entryRoute: "pathway" });
  const groups = resolveSourceClaims([direct, priorYear, pathway]);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((group) => group.conflictStatus === "NONE"));
});

test("program-specific requirements take precedence over university-wide requirements", () => {
  const universityWide = [claim({ studyLevel: "graduate" })];
  const mba = [claim({ programKey: "mba", entityKey: "mba", studyLevel: "graduate", value: 7, normalizedValue: "7" })];
  assert.equal(preferredClaimForProgram(universityWide, mba, "ieltsOverall")?.value, 7);
  assert.equal(preferredClaimForProgram(universityWide, [], "ieltsOverall")?.value, 6.5);
});

test("program claim conflicts remain scoped to that program", () => {
  const officialMba = claim({ programKey: "mba", entityKey: "mba", studyLevel: "graduate", value: 7, normalizedValue: "7" });
  const partnerMba = claim({
    programKey: "mba",
    entityKey: "mba",
    studyLevel: "graduate",
    value: 6.5,
    normalizedValue: "6.5",
    sourceName: "studies-overseas",
    authorityLevel: "STUDIES_OVERSEAS",
  });
  const unrelatedProgram = claim({ programKey: "ms-cs", entityKey: "ms-cs", studyLevel: "graduate" });
  const groups = resolveSourceClaims([officialMba, partnerMba, unrelatedProgram]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((group) => group.preferred.programKey === "mba")?.conflictStatus, "CONFLICT_REVIEW");
  assert.equal(groups.find((group) => group.preferred.programKey === "ms-cs")?.conflictStatus, "NONE");
});

test("verification status transitions preserve the manual lock", () => {
  assert.equal(nextVerificationStatus("DISCOVERED", "partner-match"), "PARTNER_MATCHED");
  assert.equal(nextVerificationStatus("PARTNER_MATCHED", "official-success"), "OFFICIAL_VERIFIED");
  assert.equal(nextVerificationStatus("PARTNER_MATCHED", "official-failure"), "VERIFICATION_FAILED");
  assert.equal(nextVerificationStatus("OFFICIAL_VERIFIED", "manual"), "MANUALLY_VERIFIED");
  assert.equal(nextVerificationStatus("MANUALLY_VERIFIED", "official-failure"), "MANUALLY_VERIFIED");
});
