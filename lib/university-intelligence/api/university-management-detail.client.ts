import type { UniversityManagementOverview } from "@/lib/university-intelligence";

type IsoDate = string;
export type UniversityManagementOverviewApiResult = Omit<
  UniversityManagementOverview,
  "university" | "sources" | "latestImport" | "latestReview"
> & {
  university: Omit<UniversityManagementOverview["university"], "createdAt" | "updatedAt"> & {
    createdAt: IsoDate;
    updatedAt: IsoDate;
  };
  sources: Array<Omit<UniversityManagementOverview["sources"][number], "lastCheckedAt" | "lastSuccessfulSyncAt"> & {
    lastCheckedAt: IsoDate | null;
    lastSuccessfulSyncAt: IsoDate | null;
  }>;
  latestImport: null | Omit<NonNullable<UniversityManagementOverview["latestImport"]>, "recordCreatedAt" | "jobCreatedAt"> & {
    recordCreatedAt: IsoDate;
    jobCreatedAt: IsoDate;
  };
  latestReview: null | Omit<NonNullable<UniversityManagementOverview["latestReview"]>, "reviewedAt"> & {
    reviewedAt: IsoDate;
  };
};

export class UniversityManagementDetailApiError extends Error {
  constructor(readonly status: number) {
    super("University management overview is unavailable.");
  }
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function fetchUniversityManagementDetail(
  baseUrl: string,
  id: string,
  cookie: string,
  fetcher: Fetcher = fetch,
): Promise<UniversityManagementOverviewApiResult> {
  const response = await fetcher(new URL(`/api/admin/universities/${encodeURIComponent(id)}`, baseUrl), {
    cache: "no-store",
    headers: { accept: "application/json", cookie },
  });
  if (!response.ok) throw new UniversityManagementDetailApiError(response.status);
  const payload = await response.json() as { result?: UniversityManagementOverviewApiResult };
  if (!payload.result || typeof payload.result.university?.name !== "string") {
    throw new UniversityManagementDetailApiError(502);
  }
  return payload.result;
}
