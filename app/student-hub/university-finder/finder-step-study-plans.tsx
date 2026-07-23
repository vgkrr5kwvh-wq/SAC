import ToolField from "@/components/student-hub/tool-field";
import { destinationOptions, intakeOptions, selectPrompts, studyLevelOptions, subjectOptions } from "@/lib/student-hub/university-finder/options";
import type { UniversityFinderAnswers, UniversityFinderField } from "@/lib/student-hub/university-finder/types";

type StepProps = {
  answers: UniversityFinderAnswers;
  errors: Partial<Record<UniversityFinderField, string>>;
  update: (field: UniversityFinderField, value: string) => void;
};

export default function FinderStepStudyPlans({ answers, errors, update }: StepProps) {
  return <div className="student-finder-field-grid">
    <ToolField id="finder-destination" label="Intended study destination" help="Choose the country you currently intend to study in. You can change this later." error={errors.destination} required><select id="finder-destination" value={answers.destination} onChange={(event) => update("destination", event.target.value)} aria-describedby="finder-destination-help finder-destination-error" aria-invalid={Boolean(errors.destination)} aria-required="true"><option value="">{selectPrompts.destination}</option>{destinationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    <ToolField id="finder-study-level" label="Study level" help="Choose the qualification you want to begin." error={errors.studyLevel} required><select id="finder-study-level" value={answers.studyLevel} onChange={(event) => update("studyLevel", event.target.value)} aria-describedby="finder-study-level-help finder-study-level-error" aria-invalid={Boolean(errors.studyLevel)} aria-required="true"><option value="">{selectPrompts.studyLevel}</option>{studyLevelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    <ToolField id="finder-subject" label="Intended subject or major" help="Choose the closest subject area. Program names vary between universities." error={errors.subject} required><select id="finder-subject" value={answers.subject} onChange={(event) => update("subject", event.target.value)} aria-describedby="finder-subject-help finder-subject-error" aria-invalid={Boolean(errors.subject)} aria-required="true"><option value="">{selectPrompts.subject}</option>{subjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
    <ToolField id="finder-intake" label="Preferred intake" help="Intake availability varies by program and may change."><select id="finder-intake" value={answers.preferredIntake} onChange={(event) => update("preferredIntake", event.target.value)} aria-describedby="finder-intake-help finder-intake-error"><option value="">{selectPrompts.preferredIntake}</option>{intakeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></ToolField>
  </div>;
}
