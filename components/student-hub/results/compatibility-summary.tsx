import type { RecommendationExplanations } from "@/lib/student-hub/university-finder/types";

export default function CompatibilitySummary({ explanations }: { explanations: RecommendationExplanations }) {
  const items = [
    { label: "Aligns", count: explanations.aligns.length, tone: "aligns" },
    { label: "Verify", count: explanations.needsVerification.length, tone: "verify" },
    { label: "May differ", count: explanations.mayNotAlign.length, tone: "differs" },
  ] as const;

  return (
    <dl className="finder-compatibility-summary" aria-label="Compatibility summary">
      {items.map((item) => (
        <div className={`is-${item.tone}`} key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.count}</dd>
        </div>
      ))}
    </dl>
  );
}
