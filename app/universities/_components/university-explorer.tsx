import type { UniversitySearchApiResponse, UniversityExplorerFilters } from "@/lib/university-intelligence/api/university-search.client";
import UniversityCard from "./university-card";
import UniversityFilters from "./university-filters";
import UniversityPagination from "./university-pagination";

export default function UniversityExplorer({
  filters,
  response,
  hasError = false,
}: {
  filters: UniversityExplorerFilters;
  response?: UniversitySearchApiResponse;
  hasError?: boolean;
}) {
  return (
    <section className="university-explorer-section">
      <div className="shell">
        <UniversityFilters filters={filters} />
        {hasError ? (
          <div className="university-explorer-state" role="alert">
            <span>Search unavailable</span>
            <h2>We could not load universities right now.</h2>
            <p>Please try again in a moment.</p>
          </div>
        ) : response?.result.items.length ? (
          <>
            <div className="university-results-heading">
              <div>
                <span>University directory</span>
                <h2>
                  {response.result.pagination.totalItems}{" "}
                  {response.result.pagination.totalItems === 1
                    ? "university"
                    : "universities"} found
                </h2>
              </div>
              <p>
                Review verified university facts and continue to the official
                source when available.
              </p>
            </div>
            <div className="university-grid">
              {response.result.items.map((university) => (
                <UniversityCard
                  key={university.id}
                  university={university}
                />
              ))}
            </div>
            <UniversityPagination
              filters={filters}
              pagination={response.result.pagination}
            />
          </>
        ) : (
          <div className="university-explorer-state">
            <span>No matching universities</span>
            <h2>Try broadening your search.</h2>
            <p>
              Remove a filter or search with a different university or
              location.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
