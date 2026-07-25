import type {
  PaginatedResult,
  ProgramCard,
  ScholarshipCard,
  UniversityDetail,
} from "@/lib/university-intelligence";

type SerializedUniversityDetail = Omit<
  UniversityDetail,
  "createdAt" | "updatedAt"
> & {
  createdAt: string;
  updatedAt: string;
};

type SerializedScholarshipCard = Omit<ScholarshipCard, "deadline"> & {
  deadline: string | null;
};

export type UniversityDetailApiResponse = {
  university: SerializedUniversityDetail;
  programs: PaginatedResult<ProgramCard>;
  scholarships: PaginatedResult<SerializedScholarshipCard>;
};

export class UniversityDetailApiError extends Error {
  constructor(readonly status: number) {
    super("University profile is temporarily unavailable.");
  }
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function isDetailResponse(value: unknown): value is UniversityDetailApiResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Partial<UniversityDetailApiResponse>;
  return typeof response.university?.name === "string"
    && typeof response.university.slug === "string"
    && Array.isArray(response.programs?.items)
    && Array.isArray(response.scholarships?.items);
}

export async function fetchUniversityDetail(
  baseUrl: string,
  slug: string,
  fetcher: Fetcher = fetch,
): Promise<UniversityDetailApiResponse> {
  const url = new URL(
    `/api/universities/${encodeURIComponent(slug)}`,
    baseUrl,
  );
  const response = await fetcher(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new UniversityDetailApiError(response.status);
  const payload: unknown = await response.json();
  if (!isDetailResponse(payload)) throw new UniversityDetailApiError(502);
  return payload;
}
