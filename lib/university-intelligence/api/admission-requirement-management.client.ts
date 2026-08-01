import type { AdmissionRequirementManagementFilters, AdmissionRequirementManagementResult, UniversityManagementIdentity } from "@/lib/university-intelligence";

export type AdmissionRequirementManagementApiResult = Omit<AdmissionRequirementManagementResult, "requirements"> & {
  requirements: Array<Omit<AdmissionRequirementManagementResult["requirements"][number], "updatedAt"> & { updatedAt: string }>;
};
export type UniversityAdmissionRequirementManagementApiResponse = { university: UniversityManagementIdentity; result: AdmissionRequirementManagementApiResult };

export class AdmissionRequirementManagementApiError extends Error {
  constructor(readonly status: number) { super("University admission requirements are unavailable."); }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function buildAdmissionRequirementManagementApiUrl(baseUrl: string, universityId: string, filters: AdmissionRequirementManagementFilters) {
  const url = new URL(`/api/admin/universities/${encodeURIComponent(universityId)}/requirements`, baseUrl);
  const values = { q: filters.query, studyLevel: filters.studyLevel, degreeLevel: filters.degreeLevel, programId: filters.programId, publicationStatus: filters.publicationStatus, verificationStatus: filters.verificationStatus, scope: filters.scope };
  for (const [name, value] of Object.entries(values)) if (value) url.searchParams.set(name, value);
  return url;
}

export async function fetchAdmissionRequirementManagement(baseUrl: string, universityId: string, filters: AdmissionRequirementManagementFilters, cookie: string, fetcher: Fetcher = fetch): Promise<UniversityAdmissionRequirementManagementApiResponse> {
  const response = await fetcher(buildAdmissionRequirementManagementApiUrl(baseUrl, universityId, filters), { cache: "no-store", headers: { accept: "application/json", cookie } });
  if (!response.ok) throw new AdmissionRequirementManagementApiError(response.status);
  const payload = await response.json() as Partial<UniversityAdmissionRequirementManagementApiResponse>;
  if (typeof payload.university?.name !== "string" || !Array.isArray(payload.result?.requirements)) throw new AdmissionRequirementManagementApiError(502);
  return payload as UniversityAdmissionRequirementManagementApiResponse;
}
