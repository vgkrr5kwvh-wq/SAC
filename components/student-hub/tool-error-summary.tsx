export default function ToolErrorSummary({ messages }: { messages: readonly string[] }) {
  if (!messages.length) return <div className="student-finder-validation-placeholder" aria-hidden="true">Validation guidance will appear here when field validation is added.</div>;
  return <div className="student-finder-error-summary" role="alert" tabIndex={-1}><h3>Check your answers</h3><ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul></div>;
}
