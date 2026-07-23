import type { University } from "../universities/types";
import type { RecommendationDemoMetadata } from "./types";

export const demonstrationRecordExplanation =
  "Demonstration record only—this is not a real university recommendation.";

export function isDemonstrationCatalog(
  catalog: readonly University[],
): boolean {
  return catalog.length > 0 && catalog.every((university) => university.sample);
}

export function shouldShowDemonstrationCatalogNotice(
  catalog: readonly University[],
): boolean {
  return catalog.some((university) => university.sample);
}

export function buildRecommendationDemoMetadata(
  university: University,
): RecommendationDemoMetadata {
  return university.sample
    ? {
        isSampleRecord: true,
        badgeLabel: "Demonstration record",
        explanation: demonstrationRecordExplanation,
      }
    : {
        isSampleRecord: false,
        badgeLabel: null,
        explanation: null,
      };
}
