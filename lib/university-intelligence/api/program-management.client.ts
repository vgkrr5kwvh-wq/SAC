import type {
  ProgramManagementFilters,
  ProgramManagementResult,
  UniversityManagementIdentity,
} from "@/lib/university-intelligence";

export type ProgramManagementApiResult = Omit<ProgramManagementResult, "programs"> & {
  programs: Array<Omit<ProgramManagementResult["programs"][number], "updatedAt"> & { updatedAt: string }>;
};

export type UniversityProgramManagementApiResponse = {
  university: UniversityManagementIdentity;
  result: ProgramManagementApiResult;
};

export class ProgramManagementApiError extends Error {
  constructor(readonly status: number) {
    super("University programs are unavailable.");
  }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function buildProgramManagementApiUrl(baseUrl: string, universityId: string, filters: ProgramManagementFilters) {
  const url = new URL(`/api/admin/universities/${encodeURIComponent(universityId)}/programs`, baseUrl);
  if (filters.query) url.searchParams.set("q", filters.query);
  if (filters.degreeLevel) url.searchParams.set("degreeLevel", filters.degreeLevel);
  if (filters.campus) url.searchParams.set("campus", filters.campus);
  if (filters.intake) url.searchParams.set("intake", filters.intake);
  if (filters.publicationStatus) url.searchParams.set("publicationStatus", filters.publicationStatus);
  return url;
}

export async function fetchProgramManagement(
  baseUrl: string,
  universityId: string,
  filters: ProgramManagementFilters,
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<UniversityProgramManagementApiResponse> {
  const response = await fetcher(buildProgramManagementApiUrl(baseUrl, universityId, filters), {
    cache: "no-store",
    headers: { accept: "application/json", cookie },
  });
  if (!response.ok) throw new ProgramManagementApiError(response.status);
  const payload = await response.json() as Partial<UniversityProgramManagementApiResponse>;
  if (typeof payload.university?.name !== "string" || !Array.isArray(payload.result?.programs)) {
    throw new ProgramManagementApiError(502);
  }
  return payload as UniversityProgramManagementApiResponse;
}
