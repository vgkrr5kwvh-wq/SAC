export type ToolFieldError = {
  fieldId: string;
  message: string;
};

export default function ToolErrorSummary({ errors }: { errors: readonly ToolFieldError[] }) {
  if (!errors.length) {
    return <div className="student-finder-validation-placeholder" aria-hidden="true">
      Required-field guidance will appear here when needed.
    </div>;
  }

  return <div className="student-finder-error-summary" role="alert" tabIndex={-1}>
    <h3>Check your answers</h3>
    <ul>
      {errors.map((error) => <li key={error.fieldId}>
        <a href={`#${error.fieldId}`}>{error.message}</a>
      </li>)}
    </ul>
  </div>;
}
