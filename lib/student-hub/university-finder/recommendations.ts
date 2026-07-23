import type { University } from "../universities/types";
import { evaluateUniversityCompatibility } from "./compatibility";
import {
  buildRecommendationDemoMetadata,
  demonstrationRecordExplanation,
  isDemonstrationCatalog,
  shouldShowDemonstrationCatalogNotice,
} from "./demo";
import { normalizeText } from "./normalization";
import type { UniversityFinderInput } from "./schema";
import { calculatePreferenceScore } from "./scoring";
import type {
  CompatibilityCheckId,
  CompatibilityCheckResult,
  CompatibilityStatus,
  RecommendationCategory,
  RecommendationExplanations,
  UniversityCompatibilityEvaluation,
  UniversityRecommendation,
  UniversityRecommendationCollection,
} from "./types";

export const recommendationCategoryPrecedence: Readonly<Record<RecommendationCategory, number>> = {
  "strong-profile-match": 0,
  "potential-match": 1,
  "requires-counsellor-review": 2,
  "insufficient-verified-data": 3,
};

const compatibilitySortRank: Readonly<Record<CompatibilityStatus, number>> = {
  compatible: 3,
  unknown: 2,
  "not-applicable": 1,
  "not-compatible": 0,
};

const destinationLabels: Readonly<Record<string, string>> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  KR: "South Korea",
};

const studyLevelLabels: Readonly<Record<string, string>> = {
  foundation: "foundation",
  associate: "associate",
  bachelor: "bachelor’s",
  "postgraduate-certificate": "postgraduate certificate",
  master: "master’s",
  doctorate: "doctorate",
};

function getCheck(
  evaluation: UniversityCompatibilityEvaluation,
  id: CompatibilityCheckId,
): CompatibilityCheckResult {
  const check = evaluation.checks.find((candidate) => candidate.check === id);
  if (!check) throw new Error(`Missing compatibility check: ${id}`);
  return check;
}

function isHardFilterFailure(evaluation: UniversityCompatibilityEvaluation): boolean {
  return ["destination", "study-level"].some(
    (id) => getCheck(evaluation, id as CompatibilityCheckId).status !== "compatible",
  );
}

function scholarshipNeedsReview(
  questionnaire: UniversityFinderInput,
  evaluation: UniversityCompatibilityEvaluation,
): boolean {
  return questionnaire.scholarshipPreference === "required"
    && getCheck(evaluation, "scholarship-preference").status === "unknown";
}

export function categorizeRecommendation(
  questionnaire: UniversityFinderInput,
  university: University,
  evaluation: UniversityCompatibilityEvaluation,
): RecommendationCategory {
  if (university.sample) return "insufficient-verified-data";

  const subject = getCheck(evaluation, "subject");
  const academic = getCheck(evaluation, "academic-result");
  const english = getCheck(evaluation, "english-requirement");
  const coreUnknownCount = [subject, academic, english].filter(
    (check) => check.status === "unknown",
  ).length;

  if (coreUnknownCount === 3 || evaluation.summary.criticalUnknownCount >= 3) {
    return "insufficient-verified-data";
  }

  if (
    subject.status === "unknown"
    || academic.status === "unknown"
    || english.status === "unknown"
    || academic.status === "not-compatible"
    || english.status === "not-compatible"
    || scholarshipNeedsReview(questionnaire, evaluation)
  ) {
    return "requires-counsellor-review";
  }

  const verifiedProfileChecksAreCompatible = [
    getCheck(evaluation, "destination"),
    getCheck(evaluation, "study-level"),
    subject,
    academic,
    english,
  ].every((check) => check.status === "compatible");
  if (
    verifiedProfileChecksAreCompatible
    && evaluation.summary.criticalNotCompatibleCount === 0
    && evaluation.summary.criticalUnknownCount === 0
  ) {
    return "strong-profile-match";
  }

  const criticalUnknowns = evaluation.checks.filter(
    (check) => check.critical && check.status === "unknown",
  );
  const onlyTuitionIsUnknown = criticalUnknowns.every(
    (check) => check.check === "tuition-budget",
  );
  if (
    verifiedProfileChecksAreCompatible
    && evaluation.summary.criticalNotCompatibleCount === 0
    && onlyTuitionIsUnknown
  ) {
    return "potential-match";
  }

  return "requires-counsellor-review";
}

function explanationForCheck(check: CompatibilityCheckResult): string {
  const value = check.values ?? {};
  switch (check.reasonCode) {
    case "destination-match":
      return `Located in your selected destination: ${destinationLabels[String(value.universityCountry)] ?? value.universityCountry}.`;
    case "study-level-listed":
      return `Offers study options at ${studyLevelLabels[String(value.studentStudyLevel)] ?? value.studentStudyLevel} level.`;
    case "subject-exact-match":
      return "Lists a program in your selected subject area.";
    case "subject-related-only":
      return "A related subject is listed, but the exact program requires confirmation.";
    case "academic-minimum-met":
      return "Your result meets the listed minimum on the same grading scale.";
    case "academic-below-minimum":
      return "Your result is below the listed minimum on the same grading scale.";
    case "academic-requirement-missing":
    case "academic-scale-mismatch":
      return "A comparable minimum academic requirement is unavailable.";
    case "english-minimum-met":
      return "Your score meets the listed minimum for the same English test.";
    case "english-below-minimum":
      return "Your score is below the listed minimum for that test.";
    case "english-requirement-missing":
    case "english-test-not-taken":
    case "english-test-other":
      return "A verified requirement for your selected English test is unavailable.";
    case "budget-covers-minimum":
      return "The published tuition minimum is within your annual tuition budget.";
    case "budget-below-minimum":
      return "The published minimum tuition is above your stated annual budget.";
    case "tuition-minimum-missing":
    case "budget-currency-mismatch":
      return "Tuition information requires confirmation.";
    case "intake-match":
      return "Your preferred intake appears in the available intake information.";
    case "intake-data-missing":
      return "Intake availability must be confirmed for the specific program.";
    case "scholarship-data-unknown":
      return "Scholarship information requires verification.";
    default:
      return check.explanation;
  }
}

export function buildRecommendationExplanations(
  evaluation: UniversityCompatibilityEvaluation,
  university: University,
): RecommendationExplanations {
  const groups: {
    aligns: string[];
    needsVerification: string[];
    mayNotAlign: string[];
  } = {
    aligns: [],
    needsVerification: [],
    mayNotAlign: [],
  };

  evaluation.checks.forEach((check) => {
    if (check.status === "not-applicable") return;
    const explanation = explanationForCheck(check);
    if (check.status === "compatible") groups.aligns.push(explanation);
    if (check.status === "unknown") groups.needsVerification.push(explanation);
    if (check.status === "not-compatible") groups.mayNotAlign.push(explanation);
  });

  if (university.sample) {
    groups.needsVerification.unshift(demonstrationRecordExplanation);
  }

  return groups;
}

function recommendedNextStep(category: RecommendationCategory): string {
  switch (category) {
    case "strong-profile-match":
      return "Verify the specific program requirements and application dates with the university.";
    case "potential-match":
      return "Confirm the remaining tuition and program details before deciding whether to apply.";
    case "requires-counsellor-review":
      return "Review the unverified or differing requirements with a qualified counsellor and the university.";
    case "insufficient-verified-data":
      return "Use this record for demonstration only and wait for verified university information.";
  }
}

function checkRank(
  evaluation: UniversityCompatibilityEvaluation,
  checkId: CompatibilityCheckId,
): number {
  return compatibilitySortRank[getCheck(evaluation, checkId).status];
}

export function createUniversityRecommendation(
  questionnaire: UniversityFinderInput,
  university: University,
  evaluation = evaluateUniversityCompatibility(questionnaire, university),
): UniversityRecommendation | null {
  if (!university.active || isHardFilterFailure(evaluation)) return null;

  const category = categorizeRecommendation(questionnaire, university, evaluation);
  const normalizedUniversityName = normalizeText(university.name);
  return {
    university: {
      id: university.id,
      slug: university.slug,
      name: university.name,
      country: university.country,
      city: university.city,
      logo: university.logo,
      website: university.website,
      featured: university.featured,
    },
    category,
    checks: evaluation.checks,
    explanations: buildRecommendationExplanations(evaluation, university),
    recommendedNextStep: recommendedNextStep(category),
    criticalUnknownCount: evaluation.summary.criticalUnknownCount,
    criticalIncompatibilityCount: evaluation.summary.criticalNotCompatibleCount,
    internalPreferenceScore: calculatePreferenceScore(evaluation, university),
    demonstration: buildRecommendationDemoMetadata(university),
    sort: {
      categoryRank: recommendationCategoryPrecedence[category],
      subjectRank: checkRank(evaluation, "subject"),
      tuitionRank: checkRank(evaluation, "tuition-budget"),
      featuredRank: university.featured ? 1 : 0,
      normalizedUniversityName,
      stableUniversityId: university.id,
    },
  };
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function compareUniversityRecommendations(
  left: UniversityRecommendation,
  right: UniversityRecommendation,
): number {
  return left.sort.categoryRank - right.sort.categoryRank
    || right.internalPreferenceScore - left.internalPreferenceScore
    || left.criticalUnknownCount - right.criticalUnknownCount
    || right.sort.subjectRank - left.sort.subjectRank
    || right.sort.tuitionRank - left.sort.tuitionRank
    || right.sort.featuredRank - left.sort.featuredRank
    || compareText(left.sort.normalizedUniversityName, right.sort.normalizedUniversityName)
    || compareText(left.sort.stableUniversityId, right.sort.stableUniversityId);
}

export function generateUniversityRecommendations(
  questionnaire: UniversityFinderInput,
  catalog: readonly University[],
): UniversityRecommendationCollection {
  const results = catalog
    .map((university) => createUniversityRecommendation(questionnaire, university))
    .filter((recommendation): recommendation is UniversityRecommendation => recommendation !== null)
    .sort(compareUniversityRecommendations);

  return {
    results,
    isDemonstrationCatalog: isDemonstrationCatalog(catalog),
    showDemonstrationCatalogNotice: shouldShowDemonstrationCatalogNotice(catalog),
  };
}
