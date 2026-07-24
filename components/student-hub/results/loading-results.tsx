export default function LoadingResults() {
  return (
    <section className="finder-results-loading" role="status" aria-live="polite" aria-label="Preparing university results">
      <span className="finder-results-spinner" aria-hidden="true" />
      <h2>Preparing your results</h2>
      <p>Reviewing the available university records against your answers.</p>
    </section>
  );
}
