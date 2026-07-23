import ToolField from "@/components/student-hub/tool-field";
import { englishTestOptions, selectPrompts } from "@/lib/student-hub/university-finder/options";
import type { UniversityFinderAnswers, UniversityFinderField } from "@/lib/student-hub/university-finder/types";

const scoreSettings: Record<string, { min: number; max: number; step: number; help: string }> = {
  IELTS: { min: 0, max: 9, step: .5, help: "Enter an IELTS overall score from 0 to 9." },
  TOEFL: { min: 0, max: 120, step: 1, help: "Enter a TOEFL iBT score from 0 to 120." },
  PTE: { min: 10, max: 90, step: 1, help: "Enter a PTE Academic score from 10 to 90." },
  DUOLINGO: { min: 10, max: 160, step: 5, help: "Enter a Duolingo English Test score from 10 to 160." },
};

type StepProps = {
  answers: UniversityFinderAnswers;
  errors: Partial<Record<UniversityFinderField, string>>;
  update: (field: UniversityFinderField, value: string) => void;
};

export default function FinderStepEnglishPreparation({ answers, errors, update }: StepProps) {
  const score = scoreSettings[answers.englishTest];
  return <div className="student-finder-field-grid">
    <ToolField id="finder-english-test" label="English test type" help="Choose your completed test, or select ‘Not taken yet’." error={errors.englishTest} required><select id="finder-english-test" value={answers.englishTest} onChange={(event) => { update("englishTest", event.target.value); update("englishScore", ""); update("otherEnglishTest", ""); }} aria-describedby="finder-english-test-help finder-english-test-error" aria-invalid={Boolean(errors.englishTest)} aria-required="true"><option value="">{selectPrompts.englishTest}</option>{englishTestOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    {score ? <ToolField id="finder-english-score" label="English test score" help={score.help} error={errors.englishScore} required><input id="finder-english-score" type="number" min={score.min} max={score.max} step={score.step} value={answers.englishScore} onChange={(event) => update("englishScore", event.target.value)} inputMode="decimal" aria-describedby="finder-english-score-help finder-english-score-error" aria-invalid={Boolean(errors.englishScore)} aria-required="true" /></ToolField> : null}
    {answers.englishTest === "OTHER" ? <ToolField id="finder-other-test" label="Other test and score" help="Enter the test name and result. This information will require manual review." error={errors.otherEnglishTest} required><input id="finder-other-test" type="text" maxLength={80} value={answers.otherEnglishTest} onChange={(event) => update("otherEnglishTest", event.target.value)} aria-describedby="finder-other-test-help finder-other-test-error" aria-invalid={Boolean(errors.otherEnglishTest)} aria-required="true" /></ToolField> : null}
    {answers.englishTest === "NOT_TAKEN" ? <p className="student-finder-info" role="note">That is okay. A future match review will mark English requirements for confirmation.</p> : null}
  </div>;
}
