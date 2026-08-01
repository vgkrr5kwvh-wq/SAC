import type {
  ScholarshipManagementFilters,
  ScholarshipManagementResult,
  UniversityManagementIdentity,
} from "@/lib/university-intelligence";

export type ScholarshipManagementApiResult = Omit<ScholarshipManagementResult, "scholarships"> & {
  scholarships: Array<Omit<ScholarshipManagementResult["scholarships"][number], "updatedAt"> & { updatedAt: string }>;
};
export type UniversityScholarshipManagementApiResponse = { university: UniversityManagementIdentity; result: ScholarshipManagementApiResult };

export class ScholarshipManagementApiError extends Error {
  constructor(readonly status: number) { super("University scholarships are unavailable."); }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function buildScholarshipManagementApiUrl(baseUrl: string, universityId: string, filters: ScholarshipManagementFilters) {
  const url = new URL(`/api/admin/universities/${encodeURIComponent(universityId)}/scholarships`, baseUrl);
  const values = { q: filters.query, availability: filters.availability, scholarshipType: filters.scholarshipType, studyLevel: filters.studyLevel, scope: filters.scope, publicationStatus: filters.publicationStatus, verificationStatus: filters.verificationStatus };
  for (const [name, value] of Object.entries(values)) if (value) url.searchParams.set(name, value);
  return url;
}

export async function fetchScholarshipManagement(baseUrl: string, universityId: string, filters: ScholarshipManagementFilters, cookie: string, fetcher: Fetcher = fetch): Promise<UniversityScholarshipManagementApiResponse> {
  const response = await fetcher(buildScholarshipManagementApiUrl(baseUrl, universityId, filters), { cache: "no-store", headers: { accept: "application/json", cookie } });
  if (!response.ok) throw new ScholarshipManagementApiError(response.status);
  const payload = await response.json() as Partial<UniversityScholarshipManagementApiResponse>;
  if (typeof payload.university?.name !== "string" || !Array.isArray(payload.result?.scholarships)) throw new ScholarshipManagementApiError(502);
  return payload as UniversityScholarshipManagementApiResponse;
}
