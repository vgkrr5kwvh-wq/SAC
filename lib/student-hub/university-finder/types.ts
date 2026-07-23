import type { UniversityFinderInput } from "./schema";

export type UniversityFinderAnswers = Record<keyof UniversityFinderInput, string>;

export type UniversityFinderField = keyof UniversityFinderAnswers;

export type CompatibilityStatus =
  | "compatible"
  | "not-compatible"
  | "unknown"
  | "not-applicable";

export type CompatibilityCheckId =
  | "destination"
  | "study-level"
  | "subject"
  | "academic-result"
  | "english-requirement"
  | "tuition-budget"
  | "preferred-intake"
  | "scholarship-preference"
  | "preferred-location"
  | "previous-qualification";

export type CompatibilityComparableValue = string | number | boolean | null;

export type CompatibilityCheckResult = {
  check: CompatibilityCheckId;
  status: CompatibilityStatus;
  explanation: string;
  reasonCode?: string;
  critical: boolean;
  values?: Readonly<Record<string, CompatibilityComparableValue>>;
};

export type CompatibilitySummary = {
  totalChecks: number;
  statusCounts: Readonly<Record<CompatibilityStatus, number>>;
  criticalNotCompatibleCount: number;
  criticalUnknownCount: number;
  hasCriticalMismatch: boolean;
};

export type UniversityCompatibilityEvaluation = {
  universityId: string;
  universityName: string;
  checks: readonly CompatibilityCheckResult[];
  summary: CompatibilitySummary;
};

export type RecommendationCategory =
  | "strong-profile-match"
  | "potential-match"
  | "requires-counsellor-review"
  | "insufficient-verified-data";

export type RecommendationExplanations = {
  aligns: readonly string[];
  needsVerification: readonly string[];
  mayNotAlign: readonly string[];
};

export type RecommendationUniversityIdentity = {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string;
  logo: string | null;
  website: string;
  featured: boolean;
};

export type RecommendationDemoMetadata = {
  isSampleRecord: boolean;
  badgeLabel: string | null;
  explanation: string | null;
};

export type RecommendationSortMetadata = {
  categoryRank: number;
  subjectRank: number;
  tuitionRank: number;
  featuredRank: number;
  normalizedUniversityName: string;
  stableUniversityId: string;
};

export type UniversityRecommendation = {
  university: RecommendationUniversityIdentity;
  category: RecommendationCategory;
  checks: readonly CompatibilityCheckResult[];
  explanations: RecommendationExplanations;
  recommendedNextStep: string;
  criticalUnknownCount: number;
  criticalIncompatibilityCount: number;
  internalPreferenceScore: number;
  demonstration: RecommendationDemoMetadata;
  sort: RecommendationSortMetadata;
};

export type UniversityRecommendationCollection = {
  results: readonly UniversityRecommendation[];
  isDemonstrationCatalog: boolean;
  showDemonstrationCatalogNotice: boolean;
};

export const initialUniversityFinderAnswers: UniversityFinderAnswers = {
  destination: "",
  studyLevel: "",
  subject: "",
  preferredIntake: "",
  previousQualification: "",
  gradingSystem: "",
  academicScore: "",
  customGpaScale: "",
  englishTest: "",
  englishScore: "",
  otherEnglishTest: "",
  annualTuitionBudget: "",
  locationType: "",
  scholarshipPreference: "",
};
