import type { University } from "../universities";
import type {
  CompatibilityCheckId,
  UniversityCompatibilityEvaluation,
} from "./types";

export const preferenceScoreWeights = {
  subject: 4,
  tuition: 3,
  intake: 2,
  scholarship: 2,
  location: 1,
  featured: 1,
} as const;

type ScoredCheck = Exclude<CompatibilityCheckId,
  | "destination"
  | "study-level"
  | "academic-result"
  | "english-requirement"
  | "previous-qualification"
>;

const checkWeights: Readonly<Partial<Record<ScoredCheck, number>>> = {
  subject: preferenceScoreWeights.subject,
  "tuition-budget": preferenceScoreWeights.tuition,
  "preferred-intake": preferenceScoreWeights.intake,
  "scholarship-preference": preferenceScoreWeights.scholarship,
  "preferred-location": preferenceScoreWeights.location,
};

export function calculatePreferenceScore(
  evaluation: UniversityCompatibilityEvaluation,
  university: University,
): number {
  const checkScore = evaluation.checks.reduce((score, check) => {
    if (check.status !== "compatible") return score;
    return score + (checkWeights[check.check as ScoredCheck] ?? 0);
  }, 0);

  return checkScore + (university.featured ? preferenceScoreWeights.featured : 0);
}
