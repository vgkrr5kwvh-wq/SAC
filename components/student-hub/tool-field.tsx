export default function ToolField({ id, label, help, required = false, children }: { id: string; label: string; help: string; required?: boolean; children: React.ReactNode }) {
  return <div className="student-finder-field">
    <label htmlFor={id}>{label}{required ? <><span aria-hidden="true"> *</span><span className="sr-only"> (required)</span></> : null}</label>
    {children}
    <p className="student-finder-help" id={`${id}-help`}>{help}</p>
    <div className="student-finder-field-error" id={`${id}-error`} aria-live="polite" />
  </div>;
}
