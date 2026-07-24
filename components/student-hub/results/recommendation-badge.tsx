import type { RecommendationCategory } from "@/lib/student-hub/university-finder/types";

const categoryLabels: Readonly<Record<RecommendationCategory, string>> = {
  "strong-profile-match": "Strong profile match",
  "potential-match": "Potential match",
  "requires-counsellor-review": "Counsellor review recommended",
  "insufficient-verified-data": "Insufficient verified data",
};

export default function RecommendationBadge({ category }: { category: RecommendationCategory }) {
  return (
    <span className={`finder-result-badge is-${category}`}>
      {categoryLabels[category]}
    </span>
  );
}
