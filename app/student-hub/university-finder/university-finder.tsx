"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ToolErrorSummary from "@/components/student-hub/tool-error-summary";
import ToolFormActions from "@/components/student-hub/tool-form-actions";
import ToolProgress from "@/components/student-hub/tool-progress";
import ToolStep from "@/components/student-hub/tool-step";
import LoadingResults from "@/components/student-hub/results/loading-results";
import ResultsPage from "@/components/student-hub/results/results-page";
import type { University } from "@/lib/student-hub/universities";
import { generateUniversityRecommendations } from "@/lib/student-hub/university-finder/recommendations";
import {
  universityFinderSchema,
  universityFinderStep1Schema,
  universityFinderStep2Schema,
  universityFinderStep3Schema,
  universityFinderStep4Schema,
} from "@/lib/student-hub/university-finder/schema";
import {
  initialUniversityFinderAnswers,
  type UniversityFinderAnswers,
  type UniversityFinderField,
  type UniversityRecommendationCollection,
} from "@/lib/student-hub/university-finder/types";
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

type FinderErrors = Partial<Record<UniversityFinderField, string>>;
type ValidationResult = {
  success: true;
} | {
  success: false;
  error: {
    issues: readonly { path: readonly PropertyKey[]; message: string }[];
  };
};

const stepSchemas = [
  universityFinderStep1Schema,
  universityFinderStep2Schema,
  universityFinderStep3Schema,
  universityFinderStep4Schema,
] as const;

export default function UniversityFinder({ catalog }: { catalog: readonly University[] }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<UniversityFinderAnswers>(initialUniversityFinderAnswers);
  const [errors, setErrors] = useState<FinderErrors>({});
  const [recommendations, setRecommendations] = useState<UniversityRecommendationCollection | null>(null);
  const [isPreparingResults, setIsPreparingResults] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
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
  };

  const moveTo = (step: number) => {
    hasChangedStep.current = true;
    setCurrentStep(step);
    setErrors({});
  };

  const reset = () => {
    setAnswers(initialUniversityFinderAnswers);
    setErrors({});
    setRecommendations(null);
    setIsPreparingResults(false);
    moveTo(1);
  };

  const applyValidation = (result: ValidationResult) => {
    if (result.success) {
      setErrors({});
      return true;
    }

    const nextErrors: FinderErrors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as UniversityFinderField | undefined;
      if (field && !nextErrors[field]) nextErrors[field] = issue.message;
    });
    setErrors(nextErrors);
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
    return false;
  };

  const validateCurrentStep = () => {
    const schema = stepSchemas[currentStep - 1];
    return applyValidation(schema.safeParse(answers));
  };

  const continueToNextStep = () => {
    if (validateCurrentStep()) moveTo(currentStep + 1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = universityFinderSchema.safeParse(answers);
    if (!result.success) {
      applyValidation(result);
      return;
    }
    applyValidation(result);

    setIsPreparingResults(true);
    requestAnimationFrame(() => {
      setRecommendations(generateUniversityRecommendations(result.data, catalog));
      setIsPreparingResults(false);
    });
  };

  const modifyAnswers = () => {
    setRecommendations(null);
    setIsPreparingResults(false);
    moveTo(4);
  };

  const errorList = Object.entries(errors).map(([field, message]) => ({
    fieldId: fieldIds[field as UniversityFinderField],
    message,
  }));
  const step = steps[currentStep - 1];

  if (isPreparingResults) return <LoadingResults />;

  if (recommendations) {
    return (
      <ResultsPage
        answers={answers}
        recommendations={recommendations}
        totalEvaluated={catalog.length}
        onModifyAnswers={modifyAnswers}
      />
    );
  }

  return <section className="student-finder-shell" aria-label="University Match Finder questionnaire">
    <ToolProgress currentStep={currentStep} />
    <form className="student-finder-form" onSubmit={submit} noValidate>
      <ToolStep stepNumber={currentStep} title={step.title} description={step.description} headingRef={headingRef}>
        <ToolErrorSummary errors={errorList} ref={errorSummaryRef} />
        {currentStep === 1 ? <FinderStepStudyPlans answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 2 ? <FinderStepAcademicProfile answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 3 ? <FinderStepEnglishPreparation answers={answers} errors={errors} update={update} /> : null}
        {currentStep === 4 ? <FinderStepPreferencesReview answers={answers} errors={errors} update={update} /> : null}
      </ToolStep>
      <ToolFormActions currentStep={currentStep} totalSteps={steps.length} onBack={() => moveTo(currentStep - 1)} onContinue={continueToNextStep} onReset={reset} />
    </form>
  </section>;
}
