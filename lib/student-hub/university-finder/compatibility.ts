import type {
  CurrencyCode,
  ProgramEnglishRequirement,
  University,
  UniversityProgram,
} from "../universities";
import type { UniversityFinderInput } from "./schema";
import {
  isExplicitlyRelatedSubject,
  normalizeEnglishTest,
  normalizeStudyLevel,
  normalizeSubject,
  normalizeText,
} from "./normalization";
import type {
  CompatibilityCheckResult,
  CompatibilityStatus,
  UniversityCompatibilityEvaluation,
} from "./types";

const destinationCurrencies: Readonly<Record<UniversityFinderInput["destination"], CurrencyCode>> = {
  US: "USD", CA: "CAD", GB: "GBP", KR: "KRW",
};
const gradingScales: Readonly<Record<string, number>> = {
  "percentage-100": 100, "gpa-4": 4, "gpa-5": 5, "gpa-10": 10,
};
const intakeMonths: Readonly<Record<string, readonly number[]>> = {
  "january-april": [1, 2, 3, 4],
  "may-august": [5, 6, 7, 8],
  "september-december": [9, 10, 11, 12],
};

function result(
  check: CompatibilityCheckResult["check"],
  status: CompatibilityStatus,
  explanation: string,
  critical: boolean,
  reasonCode?: string,
  values?: CompatibilityCheckResult["values"],
): CompatibilityCheckResult {
  return { check, status, explanation, critical, ...(reasonCode ? { reasonCode } : {}), ...(values ? { values } : {}) };
}

function studentGradingScale(questionnaire: UniversityFinderInput): number | null {
  if (questionnaire.gradingSystem === "other") {
    const scale = Number(questionnaire.customGpaScale);
    return Number.isFinite(scale) && scale > 0 ? scale : null;
  }
  return gradingScales[questionnaire.gradingSystem] ?? null;
}

function verifiedAlternativeRequirement(
  requirements: readonly ProgramEnglishRequirement[],
): ProgramEnglishRequirement | "ambiguous" | undefined {
  const verified = requirements.filter(
    (requirement) => requirement.verification.verificationStatus === "verified",
  );
  if (verified.length === 0) return undefined;
  if (verified.length === 1) return verified[0];
  const groups = new Set(verified.map((requirement) => requirement.alternativeGroup));
  if (groups.size !== 1 || groups.has(null)) return "ambiguous";
  return [...verified].sort((left, right) =>
    left.minimumOverallScore - right.minimumOverallScore
    || normalizeText(left.testType).localeCompare(normalizeText(right.testType))
  )[0];
}

export function checkDestinationCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  const compatible = questionnaire.destination === university.country;
  return result("destination", compatible ? "compatible" : "not-compatible",
    compatible ? "The university is in your intended destination." : "The university is outside your intended destination.",
    true, compatible ? "destination-match" : "destination-mismatch",
    { studentDestination: questionnaire.destination, universityCountry: university.country });
}

export function checkStudyLevelCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  const compatible = normalizeStudyLevel(questionnaire.studyLevel) === normalizeStudyLevel(program.studyLevel);
  return result("study-level", compatible ? "compatible" : "not-compatible",
    compatible ? "The program is offered at your intended study level." : "The program is not offered at your intended study level.",
    true, compatible ? "study-level-listed" : "study-level-not-listed",
    { studentStudyLevel: questionnaire.studyLevel, programStudyLevel: program.studyLevel });
}

export function checkSubjectCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
  program: UniversityProgram,
): CompatibilityCheckResult {
  const intended = normalizeSubject(questionnaire.subject);
  const subjects = [program.subject, ...program.subjectAliases];
  const exact = subjects.find((subject) => normalizeSubject(subject) === intended);
  if (exact) return result("subject", "compatible", "The program lists a matching subject area.", true, "subject-exact-match",
    { studentSubject: questionnaire.subject, catalogSubject: exact });

  const related = subjects.find((subject) => isExplicitlyRelatedSubject(questionnaire.subject, subject));
  if (related) return result("subject", "unknown", "The program lists a related subject, but an exact match is not verified.", true, "subject-related-only",
    { studentSubject: questionnaire.subject, catalogSubject: related });

  if (university.subjectCoverage !== "verified-complete") {
    return result("subject", "unknown", "The catalog subject coverage is not complete enough to confirm a mismatch.", true, "subject-coverage-incomplete",
      { studentSubject: questionnaire.subject, subjectCoverage: university.subjectCoverage });
  }
  return result("subject", "not-compatible", "The verified-complete subject list does not include your intended subject.", true, "subject-not-listed",
    { studentSubject: questionnaire.subject });
}

export function checkAcademicCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  const studentScale = studentGradingScale(questionnaire);
  const comparable = program.academicRequirements.filter((requirement) =>
    normalizeText(requirement.gradingSystem) === normalizeText(questionnaire.gradingSystem)
    && requirement.maximumScale === studentScale
    && requirement.verification.verificationStatus === "verified"
  );
  if (comparable.length === 0) {
    return result("academic-result", "unknown", "The program has no directly comparable verified academic requirement.", true,
      program.academicRequirements.length === 0 ? "academic-requirement-missing" : "academic-scale-mismatch",
      { studentScale });
  }
  const requirement = [...comparable].sort((a, b) => a.minimumScore - b.minimumScore)[0];
  const studentScore = Number(questionnaire.academicScore);
  const compatible = studentScore >= requirement.minimumScore;
  return result("academic-result", compatible ? "compatible" : "not-compatible",
    compatible ? "Your academic result meets the listed minimum." : "Your academic result is below the listed minimum.",
    true, compatible ? "academic-minimum-met" : "academic-below-minimum",
    { studentScore, minimumScore: requirement.minimumScore, scale: requirement.maximumScale });
}

export function checkEnglishCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  if (questionnaire.englishTest === "NOT_TAKEN") {
    return result("english-requirement", "unknown", "An English test score is not available yet.", true, "english-test-not-taken");
  }
  if (questionnaire.englishTest === "OTHER") {
    return result("english-requirement", "unknown", "The selected English test cannot be compared automatically.", true, "english-test-other");
  }
  const test = normalizeEnglishTest(questionnaire.englishTest);
  const matching = program.englishRequirements.filter((requirement) => normalizeEnglishTest(requirement.testType) === test);
  const requirement = verifiedAlternativeRequirement(matching);
  if (requirement === "ambiguous") {
    return result("english-requirement", "unknown", "The matching English requirements are conflicting or ambiguous.", true, "english-requirement-conflict");
  }
  if (!requirement) {
    return result("english-requirement", "unknown", "No matching verified program English-test requirement is available.", true,
      "english-requirement-missing", { studentTest: questionnaire.englishTest });
  }
  const studentScore = Number(questionnaire.englishScore);
  const compatible = studentScore >= requirement.minimumOverallScore;
  return result("english-requirement", compatible ? "compatible" : "not-compatible",
    compatible ? "Your score meets the listed requirement for the same English test." : "Your score is below the listed requirement for the same English test.",
    true, compatible ? "english-minimum-met" : "english-below-minimum",
    { test: questionnaire.englishTest, studentScore, minimumScore: requirement.minimumOverallScore });
}

export function checkBudgetCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  if (!questionnaire.annualTuitionBudget.trim()) {
    return result("tuition-budget", "not-applicable", "You did not enter a tuition budget.", false, "budget-not-provided");
  }
  if (!program.tuition) {
    return result("tuition-budget", "unknown", "Program tuition information is not available.", true, "tuition-minimum-missing");
  }
  if (program.tuition.verification.verificationStatus !== "verified") {
    return result("tuition-budget", "unknown", "Program tuition has not been verified.", true, "tuition-unverified");
  }
  if (program.tuition.period !== "academic-year") {
    return result("tuition-budget", "unknown", "The tuition period is not an academic year and cannot be compared with an annual budget.", true,
      "tuition-period-not-comparable", { tuitionPeriod: program.tuition.period });
  }
  const expectedCurrency = destinationCurrencies[questionnaire.destination];
  if (program.tuition.currency !== expectedCurrency) {
    return result("tuition-budget", "unknown", "The tuition currency does not match the destination currency.", true,
      "budget-currency-mismatch", { budgetCurrency: expectedCurrency, tuitionCurrency: program.tuition.currency });
  }
  const tuition = program.tuition.minimumAmount ?? program.tuition.amount;
  if (tuition === null) {
    return result("tuition-budget", "unknown", "The annual tuition amount is not available.", true, "tuition-minimum-missing");
  }
  const budget = Number(questionnaire.annualTuitionBudget);
  const compatible = budget >= tuition;
  return result("tuition-budget", compatible ? "compatible" : "not-compatible",
    compatible ? "Your tuition budget covers the listed annual tuition." : "Your tuition budget is below the listed annual tuition.",
    true, compatible ? "budget-covers-minimum" : "budget-below-minimum",
    { budget, minimumTuition: tuition, currency: program.tuition.currency });
}

export function checkIntakeCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  if (!questionnaire.preferredIntake || questionnaire.preferredIntake === "no-preference") {
    return result("preferred-intake", "not-applicable", "You did not select a preferred intake period.", false, "intake-no-preference");
  }
  const known = program.intakes.filter((intake) =>
    intake.month !== null
    && intake.status !== "unknown"
    && intake.verification.verificationStatus === "verified"
  );
  if (known.length === 0) return result("preferred-intake", "unknown", "Verified program intake months are not available.", false, "intake-data-missing");
  const preferred = intakeMonths[questionnaire.preferredIntake] ?? [];
  const availableMatch = known.some((intake) => intake.month !== null && preferred.includes(intake.month) && ["open", "expected"].includes(intake.status));
  return result("preferred-intake", availableMatch ? "compatible" : "not-compatible",
    availableMatch ? "The program lists an intake in your preferred period." : "The known program intakes do not match your preferred period.",
    false, availableMatch ? "intake-match" : "intake-mismatch", { preferredPeriod: questionnaire.preferredIntake });
}

export function checkScholarshipCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  if (!questionnaire.scholarshipPreference || ["no-preference", "not-essential"].includes(questionnaire.scholarshipPreference)) {
    return result("scholarship-preference", "not-applicable", "Scholarship availability is not essential to your preference.", false, "scholarship-not-essential");
  }
  if (program.scholarship.state === "available") {
    return result("scholarship-preference", "compatible", "The program positively lists scholarship availability.", false, "scholarship-listed");
  }
  if (program.scholarship.state === "unknown") {
    return result("scholarship-preference", "unknown", "Verified scholarship information is not available.", false, "scholarship-data-unknown");
  }
  return result("scholarship-preference", "not-compatible", "The program indicates that scholarships are unavailable.", false, "scholarship-unavailable");
}

export function checkLocationCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  if (!questionnaire.locationType || questionnaire.locationType === "no-preference") {
    return result("preferred-location", "not-applicable", "You did not select a preferred location type.", false, "location-no-preference");
  }
  if (program.locationClassification === "unknown" || questionnaire.locationType === "smaller-city") {
    return result("preferred-location", "unknown", "A directly comparable verified location classification is unavailable.", false,
      "location-classification-unavailable", { preferredLocation: questionnaire.locationType });
  }
  const expected: Readonly<Record<string, readonly string[]>> = {
    "major-city": ["urban"], suburban: ["suburban"], "regional-rural": ["regional", "rural"],
  };
  const compatible = (expected[questionnaire.locationType] ?? []).includes(program.locationClassification);
  return result("preferred-location", compatible ? "compatible" : "not-compatible",
    compatible ? "The program location matches your preference." : "The program location does not match your preference.",
    false, compatible ? "location-match" : "location-mismatch");
}

export function checkPreviousQualificationCompatibility(
  questionnaire: UniversityFinderInput,
  program: UniversityProgram,
): CompatibilityCheckResult {
  const requirement = program.previousQualificationRequirements.find(
    (candidate) => normalizeText(candidate.qualificationLevel) === normalizeText(questionnaire.previousQualification),
  );
  if (!requirement || requirement.state === "unknown" || requirement.state === "requires-review") {
    return result("previous-qualification", "unknown", "The previous qualification requirement requires verification.", false,
      requirement?.state === "requires-review" ? "qualification-requires-review" : "qualification-rules-unavailable");
  }
  const compatible = requirement.state === "accepted";
  return result("previous-qualification", compatible ? "compatible" : "not-compatible",
    compatible ? "Your previous qualification is listed as accepted." : "Your previous qualification is listed as not accepted.",
    false, compatible ? "qualification-accepted" : "qualification-not-accepted");
}

export function evaluateProgramCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
  program: UniversityProgram,
): UniversityCompatibilityEvaluation {
  const checks = [
    checkDestinationCompatibility(questionnaire, university),
    checkStudyLevelCompatibility(questionnaire, program),
    checkSubjectCompatibility(questionnaire, university, program),
    checkAcademicCompatibility(questionnaire, program),
    checkEnglishCompatibility(questionnaire, program),
    checkBudgetCompatibility(questionnaire, program),
    checkIntakeCompatibility(questionnaire, program),
    checkScholarshipCompatibility(questionnaire, program),
    checkLocationCompatibility(questionnaire, program),
    checkPreviousQualificationCompatibility(questionnaire, program),
  ] as const;
  const statusCounts: Record<CompatibilityStatus, number> = { compatible: 0, "not-compatible": 0, unknown: 0, "not-applicable": 0 };
  checks.forEach((check) => { statusCounts[check.status] += 1; });
  const criticalNotCompatibleCount = checks.filter((check) => check.critical && check.status === "not-compatible").length;
  const criticalUnknownCount = checks.filter((check) => check.critical && check.status === "unknown").length;
  return {
    universityId: university.id,
    universityName: university.name,
    programId: program.id,
    programName: program.name,
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

/** @deprecated Use evaluateProgramCompatibility with an explicit program. */
export const evaluateUniversityCompatibility = evaluateProgramCompatibility;
