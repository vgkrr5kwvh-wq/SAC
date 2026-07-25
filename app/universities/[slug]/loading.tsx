export default function UniversityDetailLoading() {
  return (
    <main aria-busy="true" aria-label="Loading university profile">
      <section className="university-detail-hero">
        <div className="shell">
          <div className="university-detail-loading" />
        </div>
      </section>
      <section className="section">
        <div className="shell university-loading-grid">
          {[1, 2, 3].map((item) => <span key={item} />)}
        </div>
      </section>
    </main>
  );
}
