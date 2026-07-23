const steps = ["Study Plans", "Academic Profile", "English Preparation", "Preferences & Review"];

export default function ToolProgress({ currentStep }: { currentStep: number }) {
  return <nav className="student-finder-progress" aria-label="University Finder progress">
    <p aria-live="polite">Step {currentStep} of {steps.length}: {steps[currentStep - 1]}</p>
    <ol>{steps.map((step, index) => {
      const stepNumber = index + 1;
      return <li className={stepNumber < currentStep ? "is-complete" : stepNumber === currentStep ? "is-current" : ""} key={step} aria-current={stepNumber === currentStep ? "step" : undefined}><span>{stepNumber}</span><strong>{step}</strong></li>;
    })}</ol>
  </nav>;
}
