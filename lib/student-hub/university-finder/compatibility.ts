import type {
  CurrencyCode,
  University,
  UniversityEnglishRequirement,
} from "../universities/types";
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
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  KR: "KRW",
};

const gradingScales: Readonly<Record<string, number>> = {
  "percentage-100": 100,
  "gpa-4": 4,
  "gpa-5": 5,
  "gpa-10": 10,
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
  return {
    check,
    status,
    explanation,
    critical,
    ...(reasonCode ? { reasonCode } : {}),
    ...(values ? { values } : {}),
  };
}

function studentGradingScale(questionnaire: UniversityFinderInput): number | null {
  if (questionnaire.gradingSystem === "other") {
    const scale = Number(questionnaire.customGpaScale);
    return Number.isFinite(scale) && scale > 0 ? scale : null;
  }
  return gradingScales[questionnaire.gradingSystem] ?? null;
}

function matchingEnglishRequirement(
  questionnaire: UniversityFinderInput,
  university: University,
): UniversityEnglishRequirement | undefined {
  const test = normalizeEnglishTest(questionnaire.englishTest);
  return university.englishRequirements.find(
    (requirement) => normalizeEnglishTest(requirement.test) === test,
  );
}

function scholarshipDataIsUnknown(university: University): boolean {
  const note = normalizeText(university.scholarship.note);
  return !university.scholarship.available
    && university.scholarship.names.length === 0
    && university.scholarship.maximumAmount === null
    && (note === "" || note.includes("unknown") || note.includes("not defined"));
}

export function checkDestinationCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  const compatible = questionnaire.destination === university.country;
  return result(
    "destination",
    compatible ? "compatible" : "not-compatible",
    compatible
      ? "The university is in your intended destination."
      : "The university is outside your intended destination.",
    true,
    compatible ? "destination-match" : "destination-mismatch",
    { studentDestination: questionnaire.destination, universityCountry: university.country },
  );
}

export function checkStudyLevelCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  const intendedLevel = normalizeStudyLevel(questionnaire.studyLevel);
  const listed = university.studyLevels.some(
    (level) => normalizeStudyLevel(level) === intendedLevel,
  );
  return result(
    "study-level",
    listed ? "compatible" : "not-compatible",
    listed
      ? "The university lists your intended study level."
      : "The university does not list your intended study level.",
    true,
    listed ? "study-level-listed" : "study-level-not-listed",
    { studentStudyLevel: questionnaire.studyLevel },
  );
}

export function checkSubjectCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (university.majors.length === 0) {
    return result(
      "subject",
      "unknown",
      "The university subject data is incomplete.",
      true,
      "subject-data-missing",
      { studentSubject: questionnaire.subject },
    );
  }

  const intendedSubject = normalizeSubject(questionnaire.subject);
  const exactMajor = university.majors.find(
    (major) => normalizeSubject(major) === intendedSubject,
  );
  if (exactMajor) {
    return result(
      "subject",
      "compatible",
      "The university lists a matching subject area.",
      true,
      "subject-exact-match",
      { studentSubject: questionnaire.subject, catalogSubject: exactMajor },
    );
  }

  const relatedMajor = university.majors.find(
    (major) => isExplicitlyRelatedSubject(questionnaire.subject, major),
  );
  if (relatedMajor) {
    return result(
      "subject",
      "unknown",
      "The university lists a related subject, but an exact match is not verified.",
      true,
      "subject-related-only",
      { studentSubject: questionnaire.subject, catalogSubject: relatedMajor },
    );
  }

  return result(
    "subject",
    "not-compatible",
    "The available university subject list does not include your intended subject.",
    true,
    "subject-not-listed",
    { studentSubject: questionnaire.subject },
  );
}

export function checkAcademicCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (university.minimumGpa === null || university.gpaScale === null) {
    return result(
      "academic-result",
      "unknown",
      "The university has not provided a comparable minimum academic result.",
      true,
      "academic-requirement-missing",
    );
  }

  const studentScale = studentGradingScale(questionnaire);
  if (studentScale === null || studentScale !== university.gpaScale) {
    return result(
      "academic-result",
      "unknown",
      "The student and university grading scales are not directly comparable.",
      true,
      "academic-scale-mismatch",
      { studentScale, universityScale: university.gpaScale },
    );
  }

  const studentScore = Number(questionnaire.academicScore);
  const meetsMinimum = studentScore >= university.minimumGpa;
  return result(
    "academic-result",
    meetsMinimum ? "compatible" : "not-compatible",
    meetsMinimum
      ? "Your academic result meets the listed minimum."
      : "Your academic result is below the listed minimum.",
    true,
    meetsMinimum ? "academic-minimum-met" : "academic-below-minimum",
    {
      studentScore,
      minimumScore: university.minimumGpa,
      scale: university.gpaScale,
    },
  );
}

export function checkEnglishCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (questionnaire.englishTest === "NOT_TAKEN") {
    return result(
      "english-requirement",
      "unknown",
      "An English test score is not available yet.",
      true,
      "english-test-not-taken",
    );
  }
  if (questionnaire.englishTest === "OTHER") {
    return result(
      "english-requirement",
      "unknown",
      "The selected English test cannot be compared automatically.",
      true,
      "english-test-other",
    );
  }

  const requirement = matchingEnglishRequirement(questionnaire, university);
  if (!requirement || requirement.minimumOverallScore === null) {
    return result(
      "english-requirement",
      "unknown",
      "No matching university English-test requirement is available.",
      true,
      "english-requirement-missing",
      { studentTest: questionnaire.englishTest },
    );
  }

  const studentScore = Number(questionnaire.englishScore);
  const meetsMinimum = studentScore >= requirement.minimumOverallScore;
  return result(
    "english-requirement",
    meetsMinimum ? "compatible" : "not-compatible",
    meetsMinimum
      ? "Your score meets the listed requirement for the same English test."
      : "Your score is below the listed requirement for the same English test.",
    true,
    meetsMinimum ? "english-minimum-met" : "english-below-minimum",
    {
      test: questionnaire.englishTest,
      studentScore,
      minimumScore: requirement.minimumOverallScore,
    },
  );
}

export function checkBudgetCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (!questionnaire.annualTuitionBudget.trim()) {
    return result(
      "tuition-budget",
      "not-applicable",
      "You did not enter a tuition budget.",
      false,
      "budget-not-provided",
    );
  }

  const expectedCurrency = destinationCurrencies[questionnaire.destination];
  if (university.tuition.currency !== expectedCurrency) {
    return result(
      "tuition-budget",
      "unknown",
      "The tuition currency does not match the destination currency.",
      true,
      "budget-currency-mismatch",
      { budgetCurrency: expectedCurrency, tuitionCurrency: university.tuition.currency },
    );
  }
  if (university.tuition.minimum === null) {
    return result(
      "tuition-budget",
      "unknown",
      "The university minimum tuition is not available.",
      true,
      "tuition-minimum-missing",
      { currency: university.tuition.currency },
    );
  }

  const budget = Number(questionnaire.annualTuitionBudget);
  const coversMinimum = budget >= university.tuition.minimum;
  return result(
    "tuition-budget",
    coversMinimum ? "compatible" : "not-compatible",
    coversMinimum
      ? "Your tuition budget covers the listed minimum tuition."
      : "Your tuition budget is below the listed minimum tuition.",
    true,
    coversMinimum ? "budget-covers-minimum" : "budget-below-minimum",
    {
      budget,
      minimumTuition: university.tuition.minimum,
      currency: university.tuition.currency,
    },
  );
}

export function checkIntakeCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (!questionnaire.preferredIntake || questionnaire.preferredIntake === "no-preference") {
    return result(
      "preferred-intake",
      "not-applicable",
      "You did not select a preferred intake period.",
      false,
      "intake-no-preference",
    );
  }

  const universityMonths = university.intakePeriods.flatMap((intake) => intake.months);
  if (universityMonths.length === 0) {
    return result(
      "preferred-intake",
      "unknown",
      "Verified university intake months are not available.",
      false,
      "intake-data-missing",
    );
  }

  const preferredMonths = intakeMonths[questionnaire.preferredIntake] ?? [];
  const matches = preferredMonths.some((month) => universityMonths.includes(month));
  return result(
    "preferred-intake",
    matches ? "compatible" : "not-compatible",
    matches
      ? "The university lists an intake in your preferred period."
      : "The verified university intakes do not match your preferred period.",
    false,
    matches ? "intake-match" : "intake-mismatch",
    { preferredPeriod: questionnaire.preferredIntake },
  );
}

export function checkScholarshipCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (
    !questionnaire.scholarshipPreference
    || questionnaire.scholarshipPreference === "no-preference"
    || questionnaire.scholarshipPreference === "not-essential"
  ) {
    return result(
      "scholarship-preference",
      "not-applicable",
      "Scholarship availability is not essential to your preference.",
      false,
      "scholarship-not-essential",
    );
  }

  if (university.scholarship.available) {
    return result(
      "scholarship-preference",
      "compatible",
      "The university positively lists scholarship availability.",
      false,
      "scholarship-listed",
      { scholarshipCount: university.scholarship.names.length },
    );
  }
  if (scholarshipDataIsUnknown(university)) {
    return result(
      "scholarship-preference",
      "unknown",
      "Verified scholarship information is not available.",
      false,
      "scholarship-data-unknown",
    );
  }

  return result(
    "scholarship-preference",
    "not-compatible",
    "The university indicates that scholarships are not available.",
    false,
    "scholarship-unavailable",
  );
}

export function checkLocationCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  if (!questionnaire.locationType || questionnaire.locationType === "no-preference") {
    return result(
      "preferred-location",
      "not-applicable",
      "You did not select a preferred location type.",
      false,
      "location-no-preference",
    );
  }
  return result(
    "preferred-location",
    "unknown",
    "The catalog does not yet contain verified location classifications.",
    false,
    "location-classification-unavailable",
    { preferredLocation: questionnaire.locationType, universityCity: university.city },
  );
}

export function checkPreviousQualificationCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): CompatibilityCheckResult {
  return result(
    "previous-qualification",
    "unknown",
    "The catalog does not yet contain verified qualification-entry rules.",
    false,
    "qualification-rules-unavailable",
    {
      previousQualification: questionnaire.previousQualification,
      universityId: university.id,
    },
  );
}

export function evaluateUniversityCompatibility(
  questionnaire: UniversityFinderInput,
  university: University,
): UniversityCompatibilityEvaluation {
  const checks = [
    checkDestinationCompatibility(questionnaire, university),
    checkStudyLevelCompatibility(questionnaire, university),
    checkSubjectCompatibility(questionnaire, university),
    checkAcademicCompatibility(questionnaire, university),
    checkEnglishCompatibility(questionnaire, university),
    checkBudgetCompatibility(questionnaire, university),
    checkIntakeCompatibility(questionnaire, university),
    checkScholarshipCompatibility(questionnaire, university),
    checkLocationCompatibility(questionnaire, university),
    checkPreviousQualificationCompatibility(questionnaire, university),
  ] as const;
  const statusCounts: Record<CompatibilityStatus, number> = {
    compatible: 0,
    "not-compatible": 0,
    unknown: 0,
    "not-applicable": 0,
  };
  checks.forEach((check) => {
    statusCounts[check.status] += 1;
  });
  const criticalNotCompatibleCount = checks.filter(
    (check) => check.critical && check.status === "not-compatible",
  ).length;
  const criticalUnknownCount = checks.filter(
    (check) => check.critical && check.status === "unknown",
  ).length;

  return {
    universityId: university.id,
    universityName: university.name,
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
