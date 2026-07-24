import assert from "node:assert/strict";
import test from "node:test";
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
  evaluateProgramCompatibility,
} from "../lib/student-hub/university-finder";
import {
  normalizeEnglishTest,
  normalizeStudyLevel,
  normalizeSubject,
  normalizeSubjectTokens,
  normalizeText,
} from "../lib/student-hub/university-finder/normalization";
import { program, questionnaire, university, verifiedMetadata, withProgram, withUniversity } from "./fixtures/university-catalog";

test("normalization remains explicit and deterministic", () => {
  assert.equal(normalizeText("  Computer   Science "), "computer science");
  assert.deepEqual(normalizeSubjectTokens(" Computer-Science & IT "), ["computer", "science", "and", "it"]);
  assert.equal(normalizeSubject("COMPUTING"), "computer-science");
  assert.equal(normalizeStudyLevel("Bachelor’s"), "bachelor");
  assert.equal(normalizeEnglishTest(" TOEFL iBT "), "TOEFL");
});

test("destination and program study level are hard-filter compatible checks", () => {
  assert.equal(checkDestinationCompatibility(questionnaire, university).status, "compatible");
  assert.equal(checkDestinationCompatibility(questionnaire, withUniversity({ country: "US" })).status, "not-compatible");
  assert.equal(checkStudyLevelCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkStudyLevelCompatibility(questionnaire, withProgram({ studyLevel: "bachelor" })).status, "not-compatible");
});

test("subject coverage controls missing-subject certainty", () => {
  assert.equal(checkSubjectCompatibility(questionnaire, university, program).status, "compatible");
  const unrelated = withProgram({ subject: "fine-arts", subjectAliases: [] });
  assert.equal(checkSubjectCompatibility(questionnaire, university, unrelated).status, "not-compatible");
  assert.equal(checkSubjectCompatibility(questionnaire, withUniversity({ subjectCoverage: "partial" }), unrelated).status, "unknown");
  assert.equal(checkSubjectCompatibility(questionnaire, withUniversity({ subjectCoverage: "unknown" }), unrelated).status, "unknown");
  assert.equal(checkSubjectCompatibility(questionnaire, university, withProgram({ subject: "data-science", subjectAliases: [] })).status, "unknown");
});

test("academic comparison is program-scoped and requires the same grading system and scale", () => {
  assert.equal(checkAcademicCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkAcademicCompatibility({ ...questionnaire, academicScore: "3.49" }, program).status, "not-compatible");
  assert.equal(checkAcademicCompatibility(questionnaire, withProgram({
    academicRequirements: [{ ...program.academicRequirements[0], maximumScale: 5 }],
  })).status, "unknown");
  assert.equal(checkAcademicCompatibility(questionnaire, withProgram({ academicRequirements: [] })).status, "unknown");
});

test("English comparison uses the same test and deterministic explicit alternatives", () => {
  assert.equal(checkEnglishCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkEnglishCompatibility({ ...questionnaire, englishScore: "7" }, program).status, "not-compatible");
  const alternatives = withProgram({
    englishRequirements: [
      { ...program.englishRequirements[0], minimumOverallScore: 7.5, alternativeGroup: "admission-alternatives" },
      { ...program.englishRequirements[0], minimumOverallScore: 7, alternativeGroup: "admission-alternatives" },
    ],
  });
  assert.equal(checkEnglishCompatibility({ ...questionnaire, englishScore: "7" }, alternatives).status, "compatible");
  const conflict = withProgram({
    englishRequirements: [
      { ...program.englishRequirements[0], minimumOverallScore: 7, alternativeGroup: null },
      { ...program.englishRequirements[0], minimumOverallScore: 7.5, alternativeGroup: null },
    ],
  });
  assert.equal(checkEnglishCompatibility(questionnaire, conflict).reasonCode, "english-requirement-conflict");
  assert.equal(checkEnglishCompatibility({ ...questionnaire, englishTest: "TOEFL", englishScore: "100" }, program).status, "unknown");
});

test("English not-taken and other selections remain unknown", () => {
  assert.equal(checkEnglishCompatibility({ ...questionnaire, englishTest: "NOT_TAKEN", englishScore: "" }, program).status, "unknown");
  assert.equal(checkEnglishCompatibility({ ...questionnaire, englishTest: "OTHER", englishScore: "", otherEnglishTest: "Cambridge" }, program).status, "unknown");
});

test("annual tuition compares only academic-year values in matching currency", () => {
  assert.equal(checkBudgetCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkBudgetCompatibility({ ...questionnaire, annualTuitionBudget: "24999" }, program).status, "not-compatible");
  assert.equal(checkBudgetCompatibility(questionnaire, withProgram({ tuition: { ...program.tuition!, period: "semester" } })).status, "unknown");
  assert.equal(checkBudgetCompatibility(questionnaire, withProgram({ tuition: { ...program.tuition!, period: "full-program" } })).status, "unknown");
  assert.equal(checkBudgetCompatibility(questionnaire, withProgram({ tuition: { ...program.tuition!, currency: "USD" } })).status, "unknown");
  assert.equal(checkBudgetCompatibility(questionnaire, withProgram({
    tuition: {
      ...program.tuition!,
      verification: { ...verifiedMetadata, verificationStatus: "unverified", sourceType: "internal", lastReviewedAt: null, sourceUrl: null },
    },
  })).status, "unknown");
  assert.equal(checkBudgetCompatibility(questionnaire, withProgram({ tuition: null })).status, "unknown");
  const noBudget = checkBudgetCompatibility({ ...questionnaire, annualTuitionBudget: "" }, program);
  assert.equal(noBudget.status, "not-applicable");
  assert.equal(noBudget.critical, false);
});

test("scholarship compatibility uses only structured state", () => {
  assert.equal(checkScholarshipCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkScholarshipCompatibility(questionnaire, withProgram({
    scholarship: { ...program.scholarship, state: "unknown", eligibilityNotes: "Definitely available" },
  })).status, "unknown");
  assert.equal(checkScholarshipCompatibility(questionnaire, withProgram({
    scholarship: { ...program.scholarship, state: "unavailable", eligibilityNotes: "Unknown in prose" },
  })).status, "not-compatible");
});

test("intakes are program-specific and honor structured status", () => {
  assert.equal(checkIntakeCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkIntakeCompatibility(questionnaire, withProgram({
    intakes: [{ ...program.intakes[0], month: 1 }],
  })).status, "not-compatible");
  assert.equal(checkIntakeCompatibility(questionnaire, withProgram({
    intakes: [{ ...program.intakes[0], status: "unknown" }],
  })).status, "unknown");
  assert.equal(checkIntakeCompatibility(questionnaire, withProgram({
    intakes: [{
      ...program.intakes[0],
      verification: { ...verifiedMetadata, verificationStatus: "unverified", sourceType: "internal", lastReviewedAt: null, sourceUrl: null },
    }],
  })).status, "unknown");
  assert.equal(checkIntakeCompatibility({ ...questionnaire, preferredIntake: "no-preference" }, program).status, "not-applicable");
});

test("previous qualification and location use structured classifications", () => {
  assert.equal(checkPreviousQualificationCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkPreviousQualificationCompatibility(questionnaire, withProgram({
    previousQualificationRequirements: [{ qualificationLevel: "bachelor-degree", state: "not-accepted", verification: verifiedMetadata }],
  })).status, "not-compatible");
  assert.equal(checkPreviousQualificationCompatibility(questionnaire, withProgram({ previousQualificationRequirements: [] })).status, "unknown");
  assert.equal(checkLocationCompatibility(questionnaire, program).status, "compatible");
  assert.equal(checkLocationCompatibility(questionnaire, withProgram({ locationClassification: "rural" })).status, "not-compatible");
  assert.equal(checkLocationCompatibility(questionnaire, withProgram({ locationClassification: "unknown" })).status, "unknown");
});

test("aggregate program evaluation is complete and deterministic", () => {
  const first = evaluateProgramCompatibility(questionnaire, university, program);
  const second = evaluateProgramCompatibility(questionnaire, university, program);
  assert.equal(first.checks.length, 10);
  assert.equal(first.programName, program.name);
  assert.deepEqual(first, second);
  assert.equal("recommendation" in first, false);
  assert.equal("score" in first, false);
});
