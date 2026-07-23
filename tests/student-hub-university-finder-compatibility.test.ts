import assert from "node:assert/strict";
import test from "node:test";
import type { University } from "../lib/student-hub/universities/types";
import {
  checkAcademicCompatibility,
  checkBudgetCompatibility,
  checkDestinationCompatibility,
  checkEnglishCompatibility,
  checkIntakeCompatibility,
  checkLocationCompatibility,
  checkPreviousQualificationCompatibility,
  checkScholarshipCompatibility,
  checkStudyLevelCompatibility,
  checkSubjectCompatibility,
  evaluateUniversityCompatibility,
} from "../lib/student-hub/university-finder/compatibility";
import {
  normalizeEnglishTest,
  normalizeStudyLevel,
  normalizeSubject,
  normalizeSubjectTokens,
  normalizeText,
} from "../lib/student-hub/university-finder/normalization";
import type { UniversityFinderInput } from "../lib/student-hub/university-finder/schema";

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
  id: "test-university-001",
  slug: "test-university",
  name: "Test University",
  country: "CA",
  city: "Test City",
  logo: null,
  website: "https://example.com/test-university",
  studyLevels: ["bachelor", "master"],
  majors: ["Computer Science", "Business"],
  minimumGpa: 3.5,
  gpaScale: 4,
  englishRequirements: [{
    test: "IELTS",
    minimumOverallScore: 7.5,
    minimumComponentScore: null,
    note: "Test fixture",
  }],
  tuition: {
    currency: "CAD",
    minimum: 25000,
    maximum: 30000,
    period: "year",
    note: "Tuition only",
  },
  livingCost: {
    currency: "CAD",
    minimum: 10000,
    maximum: 15000,
    period: "year",
    note: "Not used by compatibility",
  },
  applicationFee: {
    currency: "CAD",
    minimum: 100,
    maximum: 100,
    period: "application",
    note: "Not used by compatibility",
  },
  scholarship: {
    available: true,
    names: ["Entrance Award"],
    maximumAmount: null,
    note: "Scholarships listed",
  },
  intakePeriods: [{
    label: "Fall",
    months: [9],
    note: "Verified intake",
  }],
  featured: false,
  active: true,
  sample: false,
};

function withUniversity(overrides: Partial<University>): University {
  return { ...university, ...overrides };
}

test("normalization is trimmed, case-insensitive, and deterministic", () => {
  assert.equal(normalizeText("  Computer   Science "), "computer science");
  assert.deepEqual(normalizeSubjectTokens(" Computer-Science & IT "), ["computer", "science", "and", "it"]);
  assert.equal(normalizeSubject("COMPUTING"), "computer-science");
  assert.equal(normalizeStudyLevel("Bachelor’s"), "bachelor");
  assert.equal(normalizeEnglishTest(" TOEFL iBT "), "TOEFL");
});

test("destination compatibility returns exact match and mismatch", () => {
  assert.equal(checkDestinationCompatibility(questionnaire, university).status, "compatible");
  const mismatch = checkDestinationCompatibility(
    questionnaire,
    withUniversity({ country: "US" }),
  );
  assert.equal(mismatch.status, "not-compatible");
  assert.equal(mismatch.critical, true);
});

test("study-level compatibility returns listed match and mismatch", () => {
  assert.equal(checkStudyLevelCompatibility(questionnaire, university).status, "compatible");
  assert.equal(checkStudyLevelCompatibility(
    questionnaire,
    withUniversity({ studyLevels: ["bachelor"] }),
  ).status, "not-compatible");
});

test("subject compatibility handles normalized aliases and related subjects", () => {
  const aliasMatch = checkSubjectCompatibility(
    questionnaire,
    withUniversity({ majors: ["Computing"] }),
  );
  assert.equal(aliasMatch.status, "compatible");
  assert.equal(aliasMatch.reasonCode, "subject-exact-match");

  const related = checkSubjectCompatibility(
    questionnaire,
    withUniversity({ majors: ["Data Science"] }),
  );
  assert.equal(related.status, "unknown");
  assert.equal(related.reasonCode, "subject-related-only");

  assert.equal(checkSubjectCompatibility(
    questionnaire,
    withUniversity({ majors: ["Fine Arts"] }),
  ).status, "not-compatible");
});

test("missing university subject data remains unknown", () => {
  const result = checkSubjectCompatibility(
    questionnaire,
    withUniversity({ majors: [] }),
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.critical, true);
});

test("academic compatibility accepts the same-scale threshold boundary", () => {
  const exact = checkAcademicCompatibility(questionnaire, university);
  assert.equal(exact.status, "compatible");
  assert.deepEqual(exact.values, {
    studentScore: 3.5,
    minimumScore: 3.5,
    scale: 4,
  });

  assert.equal(checkAcademicCompatibility(
    { ...questionnaire, academicScore: "3.49" },
    university,
  ).status, "not-compatible");
});

test("academic compatibility remains unknown for different scales or missing requirements", () => {
  assert.equal(checkAcademicCompatibility(
    questionnaire,
    withUniversity({ gpaScale: 5 }),
  ).status, "unknown");
  assert.equal(checkAcademicCompatibility(
    questionnaire,
    withUniversity({ minimumGpa: null }),
  ).status, "unknown");
  assert.equal(checkAcademicCompatibility(
    questionnaire,
    withUniversity({ gpaScale: null }),
  ).status, "unknown");
});

test("English compatibility checks only the same test and threshold boundary", () => {
  assert.equal(checkEnglishCompatibility(questionnaire, university).status, "compatible");
  assert.equal(checkEnglishCompatibility(
    { ...questionnaire, englishScore: "7" },
    university,
  ).status, "not-compatible");

  const differentTest = withUniversity({
    englishRequirements: [{
      test: "TOEFL",
      minimumOverallScore: 100,
      minimumComponentScore: null,
      note: "Test fixture",
    }],
  });
  assert.equal(checkEnglishCompatibility(questionnaire, differentTest).status, "unknown");
});

test("English compatibility handles not-taken, other, and missing requirements conservatively", () => {
  assert.equal(checkEnglishCompatibility(
    { ...questionnaire, englishTest: "NOT_TAKEN", englishScore: "" },
    university,
  ).status, "unknown");
  assert.equal(checkEnglishCompatibility(
    { ...questionnaire, englishTest: "OTHER", englishScore: "", otherEnglishTest: "Cambridge C1" },
    university,
  ).status, "unknown");
  assert.equal(checkEnglishCompatibility(
    questionnaire,
    withUniversity({ englishRequirements: [] }),
  ).status, "unknown");
  assert.equal(checkEnglishCompatibility(
    questionnaire,
    withUniversity({
      englishRequirements: [{
        test: "IELTS",
        minimumOverallScore: null,
        minimumComponentScore: null,
        note: "Unknown threshold",
      }],
    }),
  ).status, "unknown");
});

test("budget compatibility handles exact minimum, below minimum, and currency mismatch", () => {
  const exact = checkBudgetCompatibility(questionnaire, university);
  assert.equal(exact.status, "compatible");
  assert.equal(exact.critical, true);

  assert.equal(checkBudgetCompatibility(
    { ...questionnaire, annualTuitionBudget: "24999" },
    university,
  ).status, "not-compatible");

  const currencyMismatch = checkBudgetCompatibility(
    questionnaire,
    withUniversity({
      tuition: { ...university.tuition, currency: "USD" },
    }),
  );
  assert.equal(currencyMismatch.status, "unknown");
  assert.equal(currencyMismatch.reasonCode, "budget-currency-mismatch");
});

test("budget compatibility is not applicable without a student budget", () => {
  const result = checkBudgetCompatibility(
    { ...questionnaire, annualTuitionBudget: "" },
    university,
  );
  assert.equal(result.status, "not-applicable");
  assert.equal(result.critical, false);

  assert.equal(checkBudgetCompatibility(
    questionnaire,
    withUniversity({ tuition: { ...university.tuition, minimum: null } }),
  ).status, "unknown");
});

test("intake compatibility handles preference, verified match, mismatch, and unknown data", () => {
  assert.equal(checkIntakeCompatibility(questionnaire, university).status, "compatible");
  assert.equal(checkIntakeCompatibility(
    questionnaire,
    withUniversity({
      intakePeriods: [{ label: "Winter", months: [1], note: "Verified" }],
    }),
  ).status, "not-compatible");
  assert.equal(checkIntakeCompatibility(
    questionnaire,
    withUniversity({ intakePeriods: [] }),
  ).status, "unknown");
  assert.equal(checkIntakeCompatibility(
    { ...questionnaire, preferredIntake: "no-preference" },
    university,
  ).status, "not-applicable");
});

test("scholarship compatibility distinguishes listed, unknown, unavailable, and non-essential data", () => {
  assert.equal(checkScholarshipCompatibility(questionnaire, university).status, "compatible");

  const unknown = withUniversity({
    scholarship: {
      available: false,
      names: [],
      maximumAmount: null,
      note: "Scholarship information is not defined.",
    },
  });
  assert.equal(checkScholarshipCompatibility(
    { ...questionnaire, scholarshipPreference: "required" },
    unknown,
  ).status, "unknown");

  const unavailable = withUniversity({
    scholarship: {
      available: false,
      names: [],
      maximumAmount: null,
      note: "Verified: no scholarships are available.",
    },
  });
  assert.equal(checkScholarshipCompatibility(questionnaire, unavailable).status, "not-compatible");
  assert.equal(checkScholarshipCompatibility(
    { ...questionnaire, scholarshipPreference: "not-essential" },
    unavailable,
  ).status, "not-applicable");
});

test("location and previous qualification remain conservative", () => {
  assert.equal(checkLocationCompatibility(questionnaire, university).status, "unknown");
  assert.equal(checkLocationCompatibility(
    { ...questionnaire, locationType: "no-preference" },
    university,
  ).status, "not-applicable");
  assert.equal(checkPreviousQualificationCompatibility(questionnaire, university).status, "unknown");
});

test("aggregate evaluation returns all checks and summary metadata without a recommendation", () => {
  const evaluation = evaluateUniversityCompatibility(questionnaire, university);
  assert.equal(evaluation.checks.length, 10);
  assert.equal(evaluation.summary.totalChecks, 10);
  assert.equal(evaluation.summary.hasCriticalMismatch, false);
  assert.equal(evaluation.summary.statusCounts.compatible, 8);
  assert.equal(evaluation.summary.statusCounts.unknown, 2);
  assert.equal(evaluation.summary.statusCounts["not-applicable"], 0);
  assert.equal("recommendation" in evaluation, false);
  assert.equal("score" in evaluation, false);
});

test("aggregate evaluation is deterministic for identical inputs", () => {
  const first = evaluateUniversityCompatibility(questionnaire, university);
  const second = evaluateUniversityCompatibility(questionnaire, university);
  assert.deepEqual(first, second);
});
