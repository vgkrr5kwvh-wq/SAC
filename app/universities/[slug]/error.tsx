"use client";

export default function UniversityDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <section className="section">
        <div className="shell university-explorer-state" role="alert">
          <span>Profile unavailable</span>
          <h1>We could not load this university.</h1>
          <p>Please try again in a moment.</p>
          <button className="button primary" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </main>
  );
}
