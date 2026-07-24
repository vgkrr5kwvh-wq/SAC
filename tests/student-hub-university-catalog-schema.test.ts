import assert from "node:assert/strict";
import test from "node:test";
import {
  parseUniversityCatalog,
  safeParseUniversityCatalog,
  sampleUniversities,
  validateUniversityCatalogInvariants,
} from "../lib/student-hub/universities";
import { program, university, withProgram, withUniversity } from "./fixtures/university-catalog";

test("runtime schema accepts a valid program-scoped catalog", () => {
  const parsed = parseUniversityCatalog([university]);
  assert.equal(parsed[0].programs[0].name, "Master of Computer Science");
});

test("runtime schema rejects invalid URLs, currencies, negative tuition, and invalid dates", () => {
  const invalidUrl = safeParseUniversityCatalog([{ ...university, website: "not-a-url" }]);
  assert.equal(invalidUrl.success, false);

  const invalidCurrency = safeParseUniversityCatalog([withUniversity({
    programs: [withProgram({ tuition: { ...program.tuition!, currency: "EUR" as "CAD" } })],
  })]);
  assert.equal(invalidCurrency.success, false);

  const negativeTuition = safeParseUniversityCatalog([withUniversity({
    programs: [withProgram({ tuition: { ...program.tuition!, minimumAmount: -1 } })],
  })]);
  assert.equal(negativeTuition.success, false);

  const invalidDate = safeParseUniversityCatalog([withUniversity({
    verification: { ...university.verification, lastReviewedAt: "2026-99-99" },
  })]);
  assert.equal(invalidDate.success, false);
});

test("runtime schema accepts supported non-annual tuition periods without making them comparable", () => {
  for (const period of ["semester", "term", "full-program", "credit-hour", "unknown"] as const) {
    assert.equal(safeParseUniversityCatalog([withUniversity({
      programs: [withProgram({ tuition: { ...program.tuition!, period } })],
    })]).success, true);
  }
  assert.equal(safeParseUniversityCatalog([withUniversity({
    programs: [withProgram({ tuition: { ...program.tuition!, period: "monthly" as "term" } })],
  })]).success, false);
});

test("catalog invariants reject duplicate university IDs and slugs", () => {
  const duplicateId = withUniversity({ slug: "second-university" });
  assert.ok(validateUniversityCatalogInvariants([university, duplicateId]).some((issue) => issue.code === "duplicate-university-id"));
  const duplicateSlug = withUniversity({ id: "university-002" });
  assert.ok(validateUniversityCatalogInvariants([university, duplicateSlug]).some((issue) => issue.code === "duplicate-university-slug"));
  assert.equal(safeParseUniversityCatalog([university, duplicateId]).success, false);
});

test("catalog invariants reject duplicate program IDs and slugs globally", () => {
  const second = withUniversity({
    id: "university-002",
    slug: "second-university",
    programs: [withProgram({ name: "Second program" })],
  });
  const issues = validateUniversityCatalogInvariants([university, second]);
  assert.ok(issues.some((issue) => issue.code === "duplicate-program-id"));
  assert.ok(issues.some((issue) => issue.code === "duplicate-program-slug"));
});

test("catalog invariants reject ambiguous duplicate English requirements", () => {
  const ambiguous = withProgram({
    englishRequirements: [
      { ...program.englishRequirements[0], minimumOverallScore: 7 },
      { ...program.englishRequirements[0], minimumOverallScore: 7.5 },
    ],
  });
  const result = safeParseUniversityCatalog([withUniversity({ programs: [ambiguous] })]);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues.map((issue) => issue.message).join(" "), /alternativeGroup/i);
});

test("catalog permits explicit same-test alternatives and rejects invalid grading scales", () => {
  const alternatives = withProgram({
    englishRequirements: [
      { ...program.englishRequirements[0], minimumOverallScore: 7, alternativeGroup: "english-alternatives" },
      { ...program.englishRequirements[0], minimumOverallScore: 7.5, alternativeGroup: "english-alternatives" },
    ],
  });
  assert.equal(safeParseUniversityCatalog([withUniversity({ programs: [alternatives] })]).success, true);

  const invalidAcademic = withProgram({
    academicRequirements: [{ ...program.academicRequirements[0], minimumScore: 5, maximumScale: 4 }],
  });
  assert.equal(safeParseUniversityCatalog([withUniversity({ programs: [invalidAcademic] })]).success, false);
});

test("inactive universities cannot contain active programs", () => {
  const result = safeParseUniversityCatalog([withUniversity({ active: false })]);
  assert.equal(result.success, false);
});

test("migrated sample catalog remains fictional, unverified, and structurally valid", () => {
  assert.equal(safeParseUniversityCatalog(sampleUniversities).success, true);
  assert.ok(sampleUniversities.every((candidate) => candidate.sampleRecord));
  assert.ok(sampleUniversities.every((candidate) => candidate.verification.sourceType === "sample"));
  assert.ok(sampleUniversities.flatMap((candidate) => candidate.programs).every((candidate) =>
    candidate.academicRequirements.length === 0
    && candidate.englishRequirements.length === 0
    && candidate.tuition === null
    && candidate.intakes.length === 0
    && candidate.scholarship.state === "unknown"
  ));
});
