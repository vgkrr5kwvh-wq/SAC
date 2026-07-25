import Link from "next/link";
import type { PaginationMetadata } from "@/lib/university-intelligence";
import type { UniversityExplorerFilters } from "@/lib/university-intelligence/api/university-search.client";

export function buildUniversityExplorerUrl(
  filters: UniversityExplorerFilters,
  page: number,
): string {
  const parameters = new URLSearchParams();
  const query = filters.query?.trim();
  const country = filters.country?.trim();
  if (query) parameters.set("q", query);
  if (country) parameters.set("country", country);
  if (filters.verificationStatus) {
    parameters.set("verificationStatus", filters.verificationStatus);
  }
  if (filters.verifiedOnly) parameters.set("verifiedOnly", "true");
  if (page > 1) parameters.set("page", String(page));
  const queryString = parameters.toString();
  return `/universities${queryString ? `?${queryString}` : ""}`;
}

export default function UniversityPagination({
  filters,
  pagination,
}: {
  filters: UniversityExplorerFilters;
  pagination: PaginationMetadata;
}) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav
      className="university-pagination"
      aria-label="University results pagination"
    >
      {pagination.page > 1 ? (
        <Link href={buildUniversityExplorerUrl(filters, pagination.page - 1)}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true">Previous</span>
      )}
      <p aria-current="page">
        Page {pagination.page} of {pagination.totalPages}
        <small>{pagination.totalItems} total universities</small>
      </p>
      {pagination.page < pagination.totalPages ? (
        <Link href={buildUniversityExplorerUrl(filters, pagination.page + 1)}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true">Next</span>
      )}
    </nav>
  );
}
