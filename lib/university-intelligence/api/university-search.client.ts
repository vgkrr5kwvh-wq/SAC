import type {
  PaginatedResult,
  UniversitySummary,
  UniversityVerificationStatus,
} from "@/lib/university-intelligence";

export type UniversityExplorerFilters = {
  query?: string;
  country?: string;
  verificationStatus?: UniversityVerificationStatus;
  verifiedOnly?: boolean;
  page?: number;
};

export type UniversitySearchApiResponse = {
  type: "universities";
  query: string;
  result: PaginatedResult<UniversitySummary>;
};

export class UniversitySearchApiError extends Error {
  constructor(readonly status: number) {
    super("University search is temporarily unavailable.");
  }
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function normalizedString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function buildUniversitySearchApiUrl(
  baseUrl: string,
  filters: UniversityExplorerFilters,
): URL {
  const url = new URL("/api/search", baseUrl);
  url.searchParams.set("type", "universities");
  url.searchParams.set("pageSize", "12");
  const query = normalizedString(filters.query);
  const country = normalizedString(filters.country);
  if (query) url.searchParams.set("q", query);
  if (country) url.searchParams.set("country", country);
  if (filters.verificationStatus) {
    url.searchParams.set(
      "verificationStatus",
      filters.verificationStatus,
    );
  }
  if (filters.verifiedOnly) url.searchParams.set("verifiedOnly", "true");
  if (filters.page && filters.page > 1) {
    url.searchParams.set("page", String(filters.page));
  }
  return url;
}

function isUniversitySearchResponse(
  value: unknown,
): value is UniversitySearchApiResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<UniversitySearchApiResponse>;
  return response.type === "universities"
    && typeof response.query === "string"
    && !!response.result
    && Array.isArray(response.result.items)
    && typeof response.result.pagination?.totalItems === "number"
    && typeof response.result.pagination?.totalPages === "number";
}

export async function fetchUniversitySearch(
  baseUrl: string,
  filters: UniversityExplorerFilters,
  fetcher: Fetcher = fetch,
): Promise<UniversitySearchApiResponse> {
  const response = await fetcher(
    buildUniversitySearchApiUrl(baseUrl, filters),
    {
      headers: { accept: "application/json" },
    },
  );
  if (!response.ok) throw new UniversitySearchApiError(response.status);
  const payload: unknown = await response.json();
  if (!isUniversitySearchResponse(payload)) {
    throw new UniversitySearchApiError(502);
  }
  return payload;
}
