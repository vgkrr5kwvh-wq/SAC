import ToolField from "@/components/student-hub/tool-field";
import ToolReviewSummary from "@/components/student-hub/tool-review-summary";
import { locationTypeOptions, scholarshipPreferenceOptions, selectPrompts } from "@/lib/student-hub/university-finder/options";
import type { UniversityFinderAnswers, UniversityFinderField } from "@/lib/student-hub/university-finder/types";

const currencyByDestination: Record<string, string> = { US: "USD", CA: "CAD", GB: "GBP", KR: "KRW" };

export default function FinderStepPreferencesReview({ answers, update }: { answers: UniversityFinderAnswers; update: (field: UniversityFinderField, value: string) => void }) {
  const currency = currencyByDestination[answers.destination] ?? "local currency";
  return <div className="student-finder-preferences">
    <div className="student-finder-field-grid">
      <ToolField id="finder-budget" label={`Annual tuition budget (${currency})`} help="Enter tuition only, excluding accommodation and living expenses."><input id="finder-budget" type="number" min="0" step={currency === "KRW" ? "1" : ".01"} value={answers.annualTuitionBudget} onChange={(event) => update("annualTuitionBudget", event.target.value)} inputMode="decimal" aria-describedby="finder-budget-help finder-budget-error" /></ToolField>
      <ToolField id="finder-location" label="Preferred location type" help="Choose the environment you prefer. This does not affect admission eligibility."><select id="finder-location" value={answers.locationType} onChange={(event) => update("locationType", event.target.value)} aria-describedby="finder-location-help finder-location-error"><option value="">{selectPrompts.locationType}</option>{locationTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
      <ToolField id="finder-scholarship" label="Scholarship preference" help="Scholarship availability and award decisions must be verified with each institution."><select id="finder-scholarship" value={answers.scholarshipPreference} onChange={(event) => update("scholarshipPreference", event.target.value)} aria-describedby="finder-scholarship-help finder-scholarship-error"><option value="">{selectPrompts.scholarshipPreference}</option>{scholarshipPreferenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    </div>
    <ToolReviewSummary answers={answers} />
  </div>;
}
