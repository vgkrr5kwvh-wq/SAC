import assert from "node:assert/strict";
import test from "node:test";
import { sampleUniversities } from "../lib/student-hub/universities";
import {
  calculatePreferenceScore,
  createUniversityRecommendation,
  evaluateProgramCompatibility,
  generateUniversityRecommendations,
  isDemonstrationCatalog,
  preferenceScoreWeights,
} from "../lib/student-hub/university-finder";
import type { UniversityFinderInput } from "../lib/student-hub/university-finder/schema";
import { program, questionnaire, university, withProgram, withUniversity } from "./fixtures/university-catalog";

test("hard filtering excludes inactive universities, inactive programs, destination mismatches, and level mismatches", () => {
  const catalog = [
    university,
    withUniversity({ id: "u-inactive", slug: "u-inactive", active: false, programs: [withProgram({ id: "p-inactive-u", slug: "p-inactive-u", active: false })] }),
    withUniversity({ id: "u-country", slug: "u-country", country: "US", programs: [withProgram({ id: "p-country", slug: "p-country" })] }),
    withUniversity({ id: "u-level", slug: "u-level", programs: [withProgram({ id: "p-level", slug: "p-level", studyLevel: "bachelor" })] }),
    withUniversity({ id: "u-program", slug: "u-program", programs: [withProgram({ id: "p-inactive", slug: "p-inactive", active: false })] }),
  ];
  assert.equal(generateUniversityRecommendations(questionnaire, catalog).results.length, 1);
});

test("complete compatible program evidence creates a strong profile match", () => {
  const recommendation = createUniversityRecommendation(questionnaire, university, program);
  assert.ok(recommendation);
  assert.equal(recommendation.category, "strong-profile-match");
  assert.equal(recommendation.program.name, "Master of Computer Science");
  assert.equal(recommendation.criticalUnknownCount, 0);
});

test("only unknown annual tuition creates a potential match", () => {
  const candidate = withProgram({ tuition: null });
  assert.equal(createUniversityRecommendation(questionnaire, university, candidate)?.category, "potential-match");
});

test("important unknowns and verified failures require counsellor review", () => {
  assert.equal(createUniversityRecommendation(questionnaire, university, withProgram({ subject: "data-science", subjectAliases: [] }))?.category, "requires-counsellor-review");
  assert.equal(createUniversityRecommendation(questionnaire, university, withProgram({
    academicRequirements: [{ ...program.academicRequirements[0], minimumScore: 3.6 }],
  }))?.category, "requires-counsellor-review");
  assert.equal(createUniversityRecommendation(questionnaire, university, withProgram({ englishRequirements: [] }))?.category, "requires-counsellor-review");
});

test("missing subject, academic, and English evidence is insufficient", () => {
  const incompleteUniversity = withUniversity({ subjectCoverage: "unknown" });
  const incompleteProgram = withProgram({
    subject: "fine-arts",
    subjectAliases: [],
    academicRequirements: [],
    englishRequirements: [],
  });
  assert.equal(
    createUniversityRecommendation(questionnaire, incompleteUniversity, incompleteProgram)?.category,
    "insufficient-verified-data",
  );
});

test("requirements are never combined across programs", () => {
  const academicMissing = withProgram({
    id: "program-academic-missing",
    slug: "program-academic-missing",
    name: "Academic Missing",
    academicRequirements: [],
  });
  const englishMissing = withProgram({
    id: "program-english-missing",
    slug: "program-english-missing",
    name: "English Missing",
    englishRequirements: [],
  });
  const candidate = withUniversity({ programs: [academicMissing, englishMissing] });
  const results = generateUniversityRecommendations(questionnaire, [candidate]).results;
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.category !== "strong-profile-match"));
  assert.ok(results.some((result) => result.explanations.needsVerification.some((text) => /academic/i.test(text))));
  assert.ok(results.some((result) => result.explanations.needsVerification.some((text) => /English/i.test(text))));
});

test("multiple matching programs at one university return separate recommendations", () => {
  const secondProgram = withProgram({
    id: "program-002",
    slug: "master-applied-computing",
    name: "Master of Applied Computing",
  });
  const results = generateUniversityRecommendations(
    questionnaire,
    [withUniversity({ programs: [program, secondProgram] })],
  ).results;
  assert.equal(results.length, 2);
  assert.deepEqual(results.map((result) => result.program.name), [
    "Master of Applied Computing",
    "Master of Computer Science",
  ]);
});

test("public presentation DTO excludes internal ranking data, catalog IDs, and reason codes", () => {
  const result = generateUniversityRecommendations(questionnaire, [university]).results[0];
  assert.ok(result);
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /internalPreferenceScore|preferenceScore|stableUniversityId|stableProgramId|reasonCode|program-001|university-001/);
  assert.equal("id" in result.university, false);
  assert.equal("id" in result.program, false);
  assert.ok(result.checks.every((check) => !("reasonCode" in check)));
});

test("preference scoring retains centralized weights without academic or English points", () => {
  const evaluation = evaluateProgramCompatibility(questionnaire, university, program);
  assert.deepEqual(preferenceScoreWeights, { subject: 4, tuition: 3, intake: 2, scholarship: 2, location: 1, featured: 1 });
  assert.equal(calculatePreferenceScore(evaluation, university), 13);
  const withoutPreferences: UniversityFinderInput = {
    ...questionnaire,
    annualTuitionBudget: "",
    preferredIntake: "no-preference",
    scholarshipPreference: "no-preference",
    locationType: "no-preference",
  };
  assert.equal(calculatePreferenceScore(evaluateProgramCompatibility(withoutPreferences, university, program), university), 5);
});

test("sample-only and mixed catalog demo behavior remains explicit", () => {
  assert.equal(isDemonstrationCatalog(sampleUniversities), true);
  const sampleAnswers: UniversityFinderInput = {
    ...questionnaire,
    destination: "US",
    studyLevel: "bachelor",
  };
  const sampleResults = generateUniversityRecommendations(sampleAnswers, sampleUniversities);
  assert.equal(sampleResults.isDemonstrationCatalog, true);
  assert.equal(sampleResults.showDemonstrationCatalogNotice, true);
  assert.ok(sampleResults.results.every((result) => result.category === "insufficient-verified-data"));
  assert.ok(sampleResults.results.every((result) => result.demonstration.isSampleRecord));

  const mixed = generateUniversityRecommendations(questionnaire, [university, sampleUniversities[0]]);
  assert.equal(mixed.isDemonstrationCatalog, false);
  assert.equal(mixed.showDemonstrationCatalogNotice, true);
});

test("empty, fully filtered, and repeated generation are deterministic", () => {
  assert.deepEqual(generateUniversityRecommendations(questionnaire, []).results, []);
  assert.deepEqual(generateUniversityRecommendations(questionnaire, [withUniversity({ country: "US" })]).results, []);
  const first = generateUniversityRecommendations(questionnaire, [university]);
  const second = generateUniversityRecommendations(questionnaire, [university]);
  assert.deepEqual(first, second);
});
