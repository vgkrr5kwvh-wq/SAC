"use client";

import { useId } from "react";
import type { UniversityRecommendation } from "@/lib/student-hub/university-finder/types";
import CompatibilitySummary from "./compatibility-summary";
import ExplanationGroup from "./explanation-group";
import RecommendationActions from "./recommendation-actions";
import RecommendationBadge from "./recommendation-badge";

const countryLabels: Readonly<Record<string, string>> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  KR: "South Korea",
};

type RecommendationCardProps = {
  recommendation: UniversityRecommendation;
  studyLevel: string;
  onModifyAnswers: () => void;
};

export default function RecommendationCard({
  recommendation,
  studyLevel,
  onModifyAnswers,
}: RecommendationCardProps) {
  const { university, explanations, demonstration } = recommendation;
  const headingId = useId();

  return (
    <article className="finder-recommendation-card" aria-labelledby={headingId}>
      <header className="finder-recommendation-header">
        <div>
          <div className="finder-recommendation-badges">
            <RecommendationBadge category={recommendation.category} />
            {university.featured ? <span className="finder-featured-badge">Featured</span> : null}
            {demonstration.badgeLabel ? <span className="finder-sample-badge">{demonstration.badgeLabel}</span> : null}
          </div>
          <h2 id={headingId}>{university.name}</h2>
          <p>{countryLabels[university.country] ?? university.country} · {university.city} · {studyLevel}</p>
        </div>
      </header>

      <CompatibilitySummary explanations={explanations} />

      <div className="finder-explanation-grid">
        <ExplanationGroup title="Aligns with your profile" symbol="✓" tone="aligns" explanations={explanations.aligns} />
        <ExplanationGroup title="Needs verification" symbol="!" tone="verify" explanations={explanations.needsVerification} />
        <ExplanationGroup title="May not align" symbol="×" tone="differs" explanations={explanations.mayNotAlign} />
      </div>

      <div className="finder-result-next-step">
        <strong>Recommended next step</strong>
        <p>{recommendation.recommendedNextStep}</p>
      </div>

      <RecommendationActions
        universityWebsite={university.website}
        universityName={university.name}
        onModifyAnswers={onModifyAnswers}
      />
    </article>
  );
}
