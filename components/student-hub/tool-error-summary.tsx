import { forwardRef } from "react";

export type ToolFieldError = {
  fieldId: string;
  message: string;
};

const ToolErrorSummary = forwardRef<HTMLDivElement, { errors: readonly ToolFieldError[] }>(function ToolErrorSummary({ errors }, ref) {
  if (!errors.length) {
    return <div className="student-finder-validation-placeholder" aria-hidden="true">
      Required-field guidance will appear here when needed.
    </div>;
  }

  return <div className="student-finder-error-summary" role="alert" tabIndex={-1} ref={ref}>
    <h3>Check your answers</h3>
    <ul>
      {errors.map((error) => <li key={error.fieldId}>
        <a href={`#${error.fieldId}`}>{error.message}</a>
      </li>)}
    </ul>
  </div>;
});

export default ToolErrorSummary;
