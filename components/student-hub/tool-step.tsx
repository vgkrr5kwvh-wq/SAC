import type { RefObject } from "react";

type ToolStepProps = {
  stepNumber: number;
  title: string;
  description: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
};

export default function ToolStep({
  stepNumber,
  title,
  description,
  headingRef,
  children,
}: ToolStepProps) {
  const headingId = `university-finder-step-${stepNumber}-heading`;

  return <fieldset className="student-finder-step" aria-labelledby={headingId}>
    <legend className="sr-only">Step {stepNumber}: {title}</legend>
    <header className="student-finder-step-heading">
      <span>Step {stepNumber}</span>
      <h2 id={headingId} ref={headingRef} tabIndex={-1}>{title}</h2>
      <p>{description}</p>
    </header>
    {children}
  </fieldset>;
}
