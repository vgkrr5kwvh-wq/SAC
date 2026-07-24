export {
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
  evaluateUniversityCompatibility,
} from "./compatibility";
export {
  buildRecommendationExplanations,
  categorizeRecommendation,
  createUniversityRecommendation,
  generateUniversityRecommendations,
  recommendationCategoryPrecedence,
} from "./recommendations";
export {
  isDemonstrationCatalog,
  shouldShowDemonstrationCatalogNotice,
} from "./demo";
export {
  calculatePreferenceScore,
  preferenceScoreWeights,
} from "./scoring";
export {
  universityFinderSchema,
  universityFinderStep1Schema,
  universityFinderStep2Schema,
  universityFinderStep3Schema,
  universityFinderStep4Schema,
} from "./schema";
export type {
  CompatibilityCheckId,
  CompatibilityStatus,
  PublicCompatibilityCheckResult,
  RecommendationCategory,
  RecommendationExplanations,
  UniversityCompatibilityEvaluation,
  UniversityFinderAnswers,
  UniversityFinderField,
  UniversityRecommendation,
  UniversityRecommendationCollection,
} from "./types";
export type { UniversityFinderInput } from "./schema";
