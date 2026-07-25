import Link from "next/link";

export default function UniversityNotFound() {
  return (
    <main>
      <section className="section">
        <div className="shell university-explorer-state">
          <span>University not found</span>
          <h1>This university profile is not available.</h1>
          <p>It may not exist or may not be published for public viewing.</p>
          <Link className="button primary" href="/universities">
            Explore universities
          </Link>
        </div>
      </section>
    </main>
  );
}
