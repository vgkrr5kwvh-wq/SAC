export default function UniversitiesLoading() {
  return (
    <main aria-busy="true" aria-label="Loading universities">
      <section className="inner-hero university-explorer-hero">
        <div className="shell">
          <span className="eyebrow">University Intelligence</span>
          <h1>Explore Universities</h1>
          <p>Loading reviewed university information…</p>
        </div>
      </section>
      <section className="university-explorer-section">
        <div className="shell university-loading-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <span key={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
