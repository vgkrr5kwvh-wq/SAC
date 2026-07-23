"use client";

export default function ToolFormActions({ currentStep, totalSteps, onBack, onContinue, onReset }: { currentStep: number; totalSteps: number; onBack: () => void; onContinue: () => void; onReset: () => void }) {
  const finalStep = currentStep === totalSteps;
  return <div className="student-finder-actions">
    <button className="button secondary" type="button" onClick={onReset}>Start again</button>
    <div>
      {currentStep > 1 ? <button className="button secondary" type="button" onClick={onBack}>Back</button> : null}
      {finalStep
        ? <button className="button primary" type="submit">Find University Matches</button>
        : <button className="button primary" type="button" onClick={onContinue}>Continue <span aria-hidden="true">→</span></button>}
    </div>
  </div>;
}
