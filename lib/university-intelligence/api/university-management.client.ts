import type {
  UniversityManagementFilters,
  UniversityManagementResult,
} from "@/lib/university-intelligence";

export type UniversityManagementApiResult = Omit<UniversityManagementResult, "universities"> & {
  universities: Array<Omit<UniversityManagementResult["universities"][number], "updatedAt"> & { updatedAt: string }>;
};

export type UniversityManagementApiResponse = {
  result: UniversityManagementApiResult;
};

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function buildUniversityManagementApiUrl(
  baseUrl: string,
  filters: UniversityManagementFilters,
): URL {
  const url = new URL("/api/admin/universities", baseUrl);
  if (filters.query) url.searchParams.set("q", filters.query);
  if (filters.country) url.searchParams.set("country", filters.country);
  if (filters.publicationStatus) url.searchParams.set("publicationStatus", filters.publicationStatus);
  if (filters.verificationStatus) url.searchParams.set("verificationStatus", filters.verificationStatus);
  return url;
}

export async function fetchUniversityManagement(
  baseUrl: string,
  filters: UniversityManagementFilters,
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<UniversityManagementApiResponse> {
  const response = await fetcher(buildUniversityManagementApiUrl(baseUrl, filters), {
    cache: "no-store",
    headers: { accept: "application/json", cookie },
  });
  if (!response.ok) throw new Error("University management data is unavailable.");
  return response.json() as Promise<UniversityManagementApiResponse>;
}
