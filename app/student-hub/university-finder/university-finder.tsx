"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ToolErrorSummary from "@/components/student-hub/tool-error-summary";
import ToolFormActions from "@/components/student-hub/tool-form-actions";
import ToolProgress from "@/components/student-hub/tool-progress";
import ToolStep from "@/components/student-hub/tool-step";
import { initialUniversityFinderAnswers, type UniversityFinderAnswers, type UniversityFinderField } from "@/lib/student-hub/university-finder/types";
import FinderStepAcademicProfile from "./finder-step-academic-profile";
import FinderStepEnglishPreparation from "./finder-step-english-preparation";
import FinderStepPreferencesReview from "./finder-step-preferences-review";
import FinderStepStudyPlans from "./finder-step-study-plans";

const steps = [
  { title: "Study Plans", description: "Tell us what and where you hope to study." },
  { title: "Academic Profile", description: "Share your current academic background." },
  { title: "English Preparation", description: "Tell us about your English test preparation." },
  { title: "Preferences & Review", description: "Add optional preferences and review your answers." },
] as const;

const fieldIds: Record<UniversityFinderField, string> = {
  destination: "finder-destination",
  studyLevel: "finder-study-level",
  subject: "finder-subject",
  preferredIntake: "finder-intake",
  previousQualification: "finder-qualification",
  gradingSystem: "finder-grading-system",
  academicScore: "finder-academic-score",
  customGpaScale: "finder-custom-scale",
  englishTest: "finder-english-test",
  englishScore: "finder-english-score",
  otherEnglishTest: "finder-other-test",
  annualTuitionBudget: "finder-budget",
  locationType: "finder-location",
  scholarshipPreference: "finder-scholarship",
};

const requiredMessages: Partial<Record<UniversityFinderField, string>> = {
  destination: "Select an intended destination.",
  studyLevel: "Select a study level.",
  subject: "Select an intended subject.",
  previousQualification: "Select your previous qualification.",
  gradingSystem: "Select a GPA scale or grading system.",
  academicScore: "Enter your GPA or percentage.",
  customGpaScale: "Enter the maximum grading scale.",
  englishTest: "Select an English test.",
  englishScore: "Enter your English test score.",
  otherEnglishTest: "Enter the other test details.",
};

type FinderErrors = Partial<Record<UniversityFinderField, string>>;

const scoreBasedTests: Readonly<Record<string, true>> = {
  IELTS: true,
  TOEFL: true,
  PTE: true,
  DUOLINGO: true,
};

export default function UniversityFinder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<UniversityFinderAnswers>(initialUniversityFinderAnswers);
  const [errors, setErrors] = useState<FinderErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasChangedStep = useRef(false);

  useEffect(() => {
    if (hasChangedStep.current) headingRef.current?.focus();
  }, [currentStep]);

  const update = (field: UniversityFinderField, value: string) => {
    setAnswers((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setStatusMessage("");
  };

  const moveTo = (step: number) => {
    hasChangedStep.current = true;
    setCurrentStep(step);
    setErrors({});
    setStatusMessage("");
  };

  const reset = () => {
    setAnswers(initialUniversityFinderAnswers);
    setErrors({});
    moveTo(1);
  };

  const validateCurrentStep = () => {
    const requiredFields: UniversityFinderField[] = currentStep === 1
      ? ["destination", "studyLevel", "subject"]
      : currentStep === 2
        ? ["previousQualification", "gradingSystem", "academicScore", ...(answers.gradingSystem === "other" ? ["customGpaScale" as const] : [])]
        : currentStep === 3
          ? ["englishTest", ...(answers.englishTest in scoreBasedTests ? ["englishScore" as const] : []), ...(answers.englishTest === "OTHER" ? ["otherEnglishTest" as const] : [])]
          : [];
    const nextErrors: FinderErrors = {};

    requiredFields.forEach((field) => {
      if (!answers[field].trim()) nextErrors[field] = requiredMessages[field];
    });

    setErrors(nextErrors);
    const firstInvalidField = requiredFields.find((field) => nextErrors[field]);
    if (firstInvalidField) {
      requestAnimationFrame(() => document.getElementById(fieldIds[firstInvalidField])?.focus());
      return false;
    }

    return true;
  };

  const continueToNextStep = () => {
    if (validateCurrentStep()) moveTo(currentStep + 1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateCurrentStep()) return;
    setStatusMessage("Matching engine will be implemented in the next phase.");
  };

  const errorList = Object.entries(errors).map(([field, message]) => ({
    fieldId: fieldIds[field as UniversityFinderField],
    message,
  }));
  const step = steps[currentStep - 1];

  return <section className="student-finder-shell" aria-label="University Match Finder questionnaire">
    <ToolProgress currentStep={currentStep} />
    <form className="student-finder-form" onSubmit={submit} noValidate>
      <ToolStep stepNumber={currentStep} title={step.title} description={step.description} headingRef={headingRef}>
        <ToolErrorSummary errors={errorList} />
        {currentStep === 1 ? <FinderStepStudyPlans answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 2 ? <FinderStepAcademicProfile answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 3 ? <FinderStepEnglishPreparation answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 4 ? <FinderStepPreferencesReview answers={answers} update={update} /> : null}
      </ToolStep>
      <ToolFormActions currentStep={currentStep} totalSteps={steps.length} onBack={() => moveTo(currentStep - 1)} onContinue={continueToNextStep} onReset={reset} />
      {statusMessage ? <div className="student-finder-submit-status" role="status" aria-live="polite">{statusMessage}</div> : null}
    </form>
  </section>;
}
