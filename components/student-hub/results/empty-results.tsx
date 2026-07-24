export default function EmptyResults({ onModifyAnswers }: { onModifyAnswers: () => void }) {
  return (
    <section className="finder-results-empty" aria-labelledby="finder-empty-title">
      <span aria-hidden="true">⌕</span>
      <h2 id="finder-empty-title">No universities matched the essential filters</h2>
      <p>
        Try adjusting your destination or study level. A broader choice may return more
        universities for you to review.
      </p>
      <button className="button primary" type="button" onClick={onModifyAnswers}>
        Modify answers
      </button>
    </section>
  );
}
