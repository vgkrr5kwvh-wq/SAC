import Link from "next/link";
import type { UniversityExplorerFilters } from "@/lib/university-intelligence/api/university-search.client";

export default function UniversityFilters({
  filters,
}: {
  filters: UniversityExplorerFilters;
}) {
  return (
    <form
      className="university-explorer-filters"
      action="/universities"
      method="get"
      role="search"
    >
      <div className="university-search-field">
        <label htmlFor="university-query">Search universities</label>
        <input
          id="university-query"
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder="Search by university or location"
        />
      </div>
      <div>
        <label htmlFor="university-country">Country</label>
        <input
          id="university-country"
          name="country"
          defaultValue={filters.country}
          placeholder="For example, USA"
        />
      </div>
      <div>
        <label htmlFor="university-verification">
          Verification status
        </label>
        <select
          id="university-verification"
          name="verificationStatus"
          defaultValue={filters.verificationStatus ?? ""}
        >
          <option value="">All statuses</option>
          <option value="OFFICIAL_VERIFIED">Officially verified</option>
          <option value="MANUALLY_VERIFIED">Manually verified</option>
          <option value="PARTNER_MATCHED">Partner matched</option>
          <option value="DISCOVERED">Source discovered</option>
        </select>
      </div>
      <label className="university-verified-toggle">
        <input
          name="verifiedOnly"
          type="checkbox"
          value="true"
          defaultChecked={filters.verifiedOnly}
        />
        Verified universities only
      </label>
      <div className="university-filter-actions">
        <button className="button primary" type="submit">
          Search
        </button>
        <Link className="button secondary" href="/universities">
          Reset filters
        </Link>
      </div>
    </form>
  );
}
