"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ToolErrorSummary from "@/components/student-hub/tool-error-summary";
import ToolFormActions from "@/components/student-hub/tool-form-actions";
import ToolProgress from "@/components/student-hub/tool-progress";
import { initialUniversityFinderAnswers, type UniversityFinderAnswers, type UniversityFinderField } from "@/lib/student-hub/university-finder/types";
import FinderStepAcademicProfile from "./finder-step-academic-profile";
import FinderStepEnglishPreparation from "./finder-step-english-preparation";
import FinderStepPreferencesReview from "./finder-step-preferences-review";
import FinderStepStudyPlans from "./finder-step-study-plans";

const stepTitles = ["Study Plans", "Academic Profile", "English Preparation", "Preferences & Review"];

export default function UniversityFinder() {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<UniversityFinderAnswers>(initialUniversityFinderAnswers);
  const [statusMessage, setStatusMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasChangedStep = useRef(false);

  useEffect(() => {
    if (hasChangedStep.current) headingRef.current?.focus();
  }, [currentStep]);

  const update = (field: UniversityFinderField, value: string) => {
    setAnswers((current) => ({ ...current, [field]: value }));
    setStatusMessage("");
  };

  const moveTo = (step: number) => {
    hasChangedStep.current = true;
    setCurrentStep(step);
    setStatusMessage("");
  };

  const reset = () => {
    setAnswers(initialUniversityFinderAnswers);
    moveTo(1);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage("Matching engine coming next.");
  };

  return <section className="student-finder-shell" aria-labelledby="university-finder-form-heading">
    <ToolProgress currentStep={currentStep} />
    <form className="student-finder-form" onSubmit={submit} noValidate>
      <header className="student-finder-step-heading">
        <span>Step {currentStep}</span>
        <h2 id="university-finder-form-heading" ref={headingRef} tabIndex={-1}>{stepTitles[currentStep - 1]}</h2>
        <p>{currentStep === 1 ? "Tell us what and where you hope to study." : currentStep === 2 ? "Share your current academic background." : currentStep === 3 ? "Tell us about your English test preparation." : "Add optional preferences and review your answers."}</p>
      </header>
      <ToolErrorSummary messages={[]} />
      {currentStep === 1 ? <FinderStepStudyPlans answers={answers} update={update} /> : null}
      {currentStep === 2 ? <FinderStepAcademicProfile answers={answers} update={update} /> : null}
      {currentStep === 3 ? <FinderStepEnglishPreparation answers={answers} update={update} /> : null}
      {currentStep === 4 ? <FinderStepPreferencesReview answers={answers} update={update} /> : null}
      <ToolFormActions currentStep={currentStep} totalSteps={4} onBack={() => moveTo(currentStep - 1)} onContinue={() => moveTo(currentStep + 1)} onReset={reset} />
      <p className="student-finder-submit-status" role="status" aria-live="polite">{statusMessage}</p>
    </form>
  </section>;
}
