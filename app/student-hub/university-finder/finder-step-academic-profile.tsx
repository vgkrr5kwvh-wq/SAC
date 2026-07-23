import ToolField from "@/components/student-hub/tool-field";
import { gradingSystemOptions, qualificationOptions, selectPrompts } from "@/lib/student-hub/university-finder/options";
import type { UniversityFinderAnswers, UniversityFinderField } from "@/lib/student-hub/university-finder/types";

type StepProps = {
  answers: UniversityFinderAnswers;
  errors: Partial<Record<UniversityFinderField, string>>;
  update: (field: UniversityFinderField, value: string) => void;
};

export default function FinderStepAcademicProfile({ answers, errors, update }: StepProps) {
  return <div className="student-finder-field-grid">
    <ToolField id="finder-qualification" label="Previous qualification" help="Select your highest completed or currently completing qualification." error={errors.previousQualification} required><select id="finder-qualification" value={answers.previousQualification} onChange={(event) => update("previousQualification", event.target.value)} aria-describedby="finder-qualification-help finder-qualification-error" aria-invalid={Boolean(errors.previousQualification)} aria-required="true"><option value="">{selectPrompts.previousQualification}</option>{qualificationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    <ToolField id="finder-grading-system" label="GPA scale or grading system" help="Do not convert your result unless your institution provides an official converted score." error={errors.gradingSystem} required><select id="finder-grading-system" value={answers.gradingSystem} onChange={(event) => update("gradingSystem", event.target.value)} aria-describedby="finder-grading-system-help finder-grading-system-error" aria-invalid={Boolean(errors.gradingSystem)} aria-required="true"><option value="">{selectPrompts.gradingSystem}</option>{gradingSystemOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    <ToolField id="finder-academic-score" label={answers.gradingSystem === "percentage-100" ? "Percentage" : "GPA or academic score"} help="Enter your cumulative result exactly as it appears on your latest transcript." error={errors.academicScore} required><input id="finder-academic-score" type="number" min="0" step="0.01" value={answers.academicScore} onChange={(event) => update("academicScore", event.target.value)} inputMode="decimal" aria-describedby="finder-academic-score-help finder-academic-score-error" aria-invalid={Boolean(errors.academicScore)} aria-required="true" /></ToolField>
    {answers.gradingSystem === "other" ? <ToolField id="finder-custom-scale" label="Maximum grading scale" help="Enter the highest possible value on your grading scale." error={errors.customGpaScale} required><input id="finder-custom-scale" type="number" min="0.01" step="0.01" value={answers.customGpaScale} onChange={(event) => update("customGpaScale", event.target.value)} inputMode="decimal" aria-describedby="finder-custom-scale-help finder-custom-scale-error" aria-invalid={Boolean(errors.customGpaScale)} aria-required="true" /></ToolField> : null}
  </div>;
}
