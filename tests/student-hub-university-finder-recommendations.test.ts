import assert from "node:assert/strict";
import test from "node:test";
import type { University } from "../lib/student-hub/universities/types";
import { evaluateUniversityCompatibility } from "../lib/student-hub/university-finder/compatibility";
import {
  isDemonstrationCatalog,
  shouldShowDemonstrationCatalogNotice,
} from "../lib/student-hub/university-finder/demo";
import {
  categorizeRecommendation,
  compareUniversityRecommendations,
  createUniversityRecommendation,
  generateUniversityRecommendations,
} from "../lib/student-hub/university-finder/recommendations";
import type { UniversityFinderInput } from "../lib/student-hub/university-finder/schema";
import {
  calculatePreferenceScore,
  preferenceScoreWeights,
} from "../lib/student-hub/university-finder/scoring";
import type {
  CompatibilityCheckId,
  CompatibilityStatus,
  UniversityCompatibilityEvaluation,
  UniversityRecommendation,
} from "../lib/student-hub/university-finder/types";

const questionnaire: UniversityFinderInput = {
  destination: "CA",
  studyLevel: "master",
  subject: "computer-science",
  preferredIntake: "september-december",
  previousQualification: "bachelor-degree",
  gradingSystem: "gpa-4",
  academicScore: "3.5",
  customGpaScale: "",
  englishTest: "IELTS",
  englishScore: "7.5",
  otherEnglishTest: "",
  annualTuitionBudget: "25000",
  locationType: "major-city",
  scholarshipPreference: "preferred",
};

const university: University = {
  id: "production-university-001",
  slug: "production-university",
  name: "Production University",
  country: "CA",
  city: "Test City",
  logo: "/test-logo.png",
  website: "https://example.com/production-university",
  studyLevels: ["bachelor", "master"],
  majors: ["Computer Science"],
  minimumGpa: 3.5,
  gpaScale: 4,
  englishRequirements: [{
    test: "IELTS",
    minimumOverallScore: 7.5,
    minimumComponentScore: null,
    note: "Verified",
  }],
  tuition: {
    currency: "CAD",
    minimum: 25000,
    maximum: 30000,
    period: "year",
    note: "Verified",
  },
  livingCost: {
    currency: "CAD",
    minimum: 10000,
    maximum: 15000,
    period: "year",
    note: "Not used",
  },
  applicationFee: {
    currency: "CAD",
    minimum: 100,
    maximum: 100,
    period: "application",
    note: "Not used",
  },
  scholarship: {
    available: true,
    names: ["Entrance Award"],
    maximumAmount: null,
    note: "Verified",
  },
  intakePeriods: [{
    label: "Fall",
    months: [9],
    note: "Verified",
  }],
  featured: true,
  active: true,
  sample: false,
};

function withUniversity(overrides: Partial<University>): University {
  return { ...university, ...overrides };
}

function recommendationFor(
  candidate = university,
  answers = questionnaire,
): UniversityRecommendation {
  const recommendation = createUniversityRecommendation(answers, candidate);
  assert.ok(recommendation);
  return recommendation;
}

function withCheckStatus(
  evaluation: UniversityCompatibilityEvaluation,
  checkId: CompatibilityCheckId,
  status: CompatibilityStatus,
): UniversityCompatibilityEvaluation {
  const checks = evaluation.checks.map((check) => (
    check.check === checkId ? { ...check, status } : check
  ));
  const statusCounts = {
    compatible: checks.filter((check) => check.status === "compatible").length,
    "not-compatible": checks.filter((check) => check.status === "not-compatible").length,
    unknown: checks.filter((check) => check.status === "unknown").length,
    "not-applicable": checks.filter((check) => check.status === "not-applicable").length,
  };
  const criticalNotCompatibleCount = checks.filter(
    (check) => check.critical && check.status === "not-compatible",
  ).length;
  const criticalUnknownCount = checks.filter(
    (check) => check.critical && check.status === "unknown",
  ).length;
  return {
    ...evaluation,
    checks,
    summary: {
      totalChecks: checks.length,
      statusCounts,
      criticalNotCompatibleCount,
      criticalUnknownCount,
      hasCriticalMismatch: criticalNotCompatibleCount > 0,
    },
  };
}

test("hard filtering excludes inactive, destination-mismatched, and study-level-mismatched universities", () => {
  const catalog = [
    withUniversity({ id: "active-match" }),
    withUniversity({ id: "inactive", active: false }),
    withUniversity({ id: "wrong-country", country: "US" }),
    withUniversity({ id: "wrong-level", studyLevels: ["bachelor"] }),
  ];
  const generated = generateUniversityRecommendations(questionnaire, catalog);
  assert.deepEqual(generated.results.map((result) => result.university.id), ["active-match"]);
});

test("creates a strong profile match from complete compatible critical evidence", () => {
  const recommendation = recommendationFor();
  assert.equal(recommendation.category, "strong-profile-match");
  assert.equal(recommendation.criticalUnknownCount, 0);
  assert.equal(recommendation.criticalIncompatibilityCount, 0);
  assert.ok(recommendation.explanations.aligns.includes("Located in your selected destination: Canada."));
});

test("creates a potential match when only tuition evidence is unknown", () => {
  const candidate = withUniversity({
    tuition: { ...university.tuition, minimum: null },
  });
  assert.equal(recommendationFor(candidate).category, "potential-match");
});

test("routes academic scale uncertainty and related subjects to counsellor review", () => {
  assert.equal(recommendationFor(
    withUniversity({ gpaScale: 5 }),
  ).category, "requires-counsellor-review");
  assert.equal(recommendationFor(
    withUniversity({ majors: ["Data Science"] }),
  ).category, "requires-counsellor-review");
});

test("verified academic or English incompatibility cannot produce strong or potential matches", () => {
  const academic = recommendationFor(withUniversity({ minimumGpa: 3.6 }));
  const english = recommendationFor(withUniversity({
    englishRequirements: [{
      test: "IELTS",
      minimumOverallScore: 8,
      minimumComponentScore: null,
      note: "Verified",
    }],
  }));
  assert.equal(academic.category, "requires-counsellor-review");
  assert.equal(english.category, "requires-counsellor-review");
  assert.ok(academic.explanations.mayNotAlign.some((text) => text.includes("below the listed minimum")));
  assert.ok(english.explanations.mayNotAlign.some((text) => text.includes("below the listed minimum")));
});

test("scholarship-required with unverified scholarship data requires counsellor review", () => {
  const answers: UniversityFinderInput = {
    ...questionnaire,
    scholarshipPreference: "required",
  };
  const candidate = withUniversity({
    scholarship: {
      available: false,
      names: [],
      maximumAmount: null,
      note: "Scholarship information is not defined.",
    },
  });
  assert.equal(recommendationFor(candidate, answers).category, "requires-counsellor-review");
});

test("insufficient core evidence produces insufficient verified data", () => {
  const candidate = withUniversity({
    majors: [],
    minimumGpa: null,
    gpaScale: null,
    englishRequirements: [],
  });
  assert.equal(recommendationFor(candidate).category, "insufficient-verified-data");
});

test("sample records are always forced to insufficient verified data", () => {
  const sample = withUniversity({ id: "sample-001", sample: true });
  const recommendation = recommendationFor(sample);
  assert.equal(recommendation.category, "insufficient-verified-data");
  assert.equal(recommendation.demonstration.isSampleRecord, true);
  assert.equal(recommendation.demonstration.badgeLabel, "Demonstration record");
  assert.match(recommendation.explanations.needsVerification[0] ?? "", /Demonstration record only/);
});

test("preference scoring applies every centralized weight", () => {
  const evaluation = evaluateUniversityCompatibility(questionnaire, university);
  assert.equal(calculatePreferenceScore(evaluation, university), 12);
  assert.deepEqual(preferenceScoreWeights, {
    subject: 4,
    tuition: 3,
    intake: 2,
    scholarship: 2,
    location: 1,
    featured: 1,
  });

  const locationCompatible = withCheckStatus(evaluation, "preferred-location", "compatible");
  assert.equal(calculatePreferenceScore(locationCompatible, university), 13);
});

test("unknown and not-applicable preferences award zero points", () => {
  let evaluation = evaluateUniversityCompatibility(questionnaire, university);
  for (const checkId of [
    "subject",
    "tuition-budget",
    "preferred-intake",
    "scholarship-preference",
    "preferred-location",
  ] as const) {
    evaluation = withCheckStatus(evaluation, checkId, "unknown");
  }
  assert.equal(calculatePreferenceScore(evaluation, withUniversity({ featured: false })), 0);
  evaluation = withCheckStatus(evaluation, "preferred-intake", "not-applicable");
  assert.equal(calculatePreferenceScore(evaluation, withUniversity({ featured: false })), 0);
});

test("academic, English, destination, and study-level compatibility never add preference score", () => {
  let evaluation = evaluateUniversityCompatibility(questionnaire, university);
  for (const checkId of [
    "subject",
    "tuition-budget",
    "preferred-intake",
    "scholarship-preference",
    "preferred-location",
  ] as const) {
    evaluation = withCheckStatus(evaluation, checkId, "unknown");
  }
  assert.equal(calculatePreferenceScore(evaluation, withUniversity({ featured: false })), 0);
});

test("the internal score is not included in user-facing explanation text", () => {
  const recommendation = recommendationFor();
  const text = [
    ...recommendation.explanations.aligns,
    ...recommendation.explanations.needsVerification,
    ...recommendation.explanations.mayNotAlign,
    recommendation.recommendedNextStep,
  ].join(" ");
  assert.doesNotMatch(text, new RegExp(`\\b${recommendation.internalPreferenceScore}\\b`));
  assert.doesNotMatch(text, /preference score/i);
});

test("category precedence sorts before preference score", () => {
  const strong = recommendationFor();
  const potential = recommendationFor(withUniversity({
    id: "potential",
    tuition: { ...university.tuition, minimum: null },
  }));
  const inflatedPotential = { ...potential, internalPreferenceScore: 999 };
  assert.ok(compareUniversityRecommendations(strong, inflatedPotential) < 0);
});

test("sorting uses higher preference score then fewer critical unknowns", () => {
  const base = recommendationFor();
  const highScore = { ...base, internalPreferenceScore: 9 };
  const lowScore = { ...base, internalPreferenceScore: 8 };
  assert.ok(compareUniversityRecommendations(highScore, lowScore) < 0);

  const fewerUnknowns = { ...base, internalPreferenceScore: 8, criticalUnknownCount: 0 };
  const moreUnknowns = { ...base, internalPreferenceScore: 8, criticalUnknownCount: 1 };
  assert.ok(compareUniversityRecommendations(fewerUnknowns, moreUnknowns) < 0);
});

test("sorting applies subject, tuition, featured, name, and stable ID tie-breakers", () => {
  const base = recommendationFor();
  const common = {
    ...base,
    internalPreferenceScore: 5,
    criticalUnknownCount: 1,
  };
  const subjectHigh = { ...common, sort: { ...common.sort, subjectRank: 3 } };
  const subjectLow = { ...common, sort: { ...common.sort, subjectRank: 2 } };
  assert.ok(compareUniversityRecommendations(subjectHigh, subjectLow) < 0);

  const tuitionHigh = { ...subjectHigh, sort: { ...subjectHigh.sort, tuitionRank: 3 } };
  const tuitionLow = { ...subjectHigh, sort: { ...subjectHigh.sort, tuitionRank: 2 } };
  assert.ok(compareUniversityRecommendations(tuitionHigh, tuitionLow) < 0);

  const featured = { ...tuitionHigh, sort: { ...tuitionHigh.sort, featuredRank: 1 } };
  const notFeatured = { ...tuitionHigh, sort: { ...tuitionHigh.sort, featuredRank: 0 } };
  assert.ok(compareUniversityRecommendations(featured, notFeatured) < 0);

  const alpha = { ...featured, sort: { ...featured.sort, normalizedUniversityName: "alpha" } };
  const beta = { ...featured, sort: { ...featured.sort, normalizedUniversityName: "beta" } };
  assert.ok(compareUniversityRecommendations(alpha, beta) < 0);

  const firstId = { ...alpha, sort: { ...alpha.sort, stableUniversityId: "id-1" } };
  const secondId = { ...alpha, sort: { ...alpha.sort, stableUniversityId: "id-2" } };
  assert.ok(compareUniversityRecommendations(firstId, secondId) < 0);
});

test("generated ordering is deterministic for identical inputs", () => {
  const catalog = [
    withUniversity({ id: "b", name: "Beta University" }),
    withUniversity({ id: "a", name: "Alpha University" }),
  ];
  assert.deepEqual(
    generateUniversityRecommendations(questionnaire, catalog),
    generateUniversityRecommendations(questionnaire, catalog),
  );
  assert.deepEqual(
    generateUniversityRecommendations(questionnaire, catalog).results.map((result) => result.university.id),
    ["a", "b"],
  );
});

test("demo detection distinguishes sample-only and mixed catalogs", () => {
  const sample = withUniversity({ id: "sample", sample: true });
  assert.equal(isDemonstrationCatalog([sample]), true);
  assert.equal(isDemonstrationCatalog([sample, university]), false);
  assert.equal(isDemonstrationCatalog([]), false);
  assert.equal(shouldShowDemonstrationCatalogNotice([sample, university]), true);

  const sampleOnly = generateUniversityRecommendations(questionnaire, [sample]);
  assert.equal(sampleOnly.isDemonstrationCatalog, true);
  assert.equal(sampleOnly.showDemonstrationCatalogNotice, true);
  assert.equal(sampleOnly.results[0]?.category, "insufficient-verified-data");

  const mixed = generateUniversityRecommendations(questionnaire, [sample, university]);
  assert.equal(mixed.isDemonstrationCatalog, false);
  assert.equal(mixed.showDemonstrationCatalogNotice, true);
  assert.equal(mixed.results.find((result) => result.university.id === "sample")?.category, "insufficient-verified-data");
  assert.equal(mixed.results.find((result) => result.university.id === university.id)?.category, "strong-profile-match");
});

test("empty catalogs and fully filtered catalogs return empty result sets", () => {
  assert.deepEqual(generateUniversityRecommendations(questionnaire, []), {
    results: [],
    isDemonstrationCatalog: false,
    showDemonstrationCatalogNotice: false,
  });
  assert.equal(generateUniversityRecommendations(questionnaire, [
    withUniversity({ active: false }),
    withUniversity({ id: "wrong-destination", country: "US" }),
  ]).results.length, 0);
});

test("categorization never emits unsupported public categories", () => {
  const evaluation = evaluateUniversityCompatibility(questionnaire, university);
  assert.equal(categorizeRecommendation(questionnaire, university, evaluation), "strong-profile-match");
});
