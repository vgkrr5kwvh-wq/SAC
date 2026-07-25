import {
  ProgramRepository,
  ScholarshipRepository,
  UniversityRepository,
  UniversitySearchService,
  type ProgramSearchFilters,
  type ScholarshipSearchFilters,
  type SearchEverythingFilters,
  type UniversitySearchFilters,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";

const CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=300";
const SEARCH_TYPES = [
  "all",
  "universities",
  "programs",
  "scholarships",
] as const;
const PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const VERIFICATION_STATUSES = [
  "DISCOVERED",
  "PARTNER_MATCHED",
  "OFFICIAL_VERIFIED",
  "MANUALLY_VERIFIED",
  "VERIFICATION_FAILED",
] as const;
const PROGRAM_SORT_FIELDS = [
  "name",
  "createdAt",
  "updatedAt",
  "degreeLevel",
  "universityName",
] as const;
const SCHOLARSHIP_SORT_FIELDS = [
  "name",
  "minimumAmount",
  "maximumAmount",
  "createdAt",
  "updatedAt",
  "universityName",
] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

type SearchService = Pick<
  UniversitySearchService,
  | "searchEverything"
  | "searchUniversities"
  | "searchPrograms"
  | "searchScholarships"
>;

class QueryValidationError extends Error {
  constructor(
    readonly parameter: string,
    message: string,
  ) {
    super(message);
  }
}

function optionalString(
  searchParams: URLSearchParams,
  name: string,
): string | undefined {
  const value = searchParams.get(name)?.trim();
  return value || undefined;
}

function oneOf<T extends string>(
  value: string | undefined,
  values: readonly T[],
  parameter: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (values.includes(value as T)) return value as T;
  throw new QueryValidationError(
    parameter,
    `${parameter} must be one of: ${values.join(", ")}.`,
  );
}

function positiveInteger(
  value: string | undefined,
  parameter: string,
  maximum?: number,
): number | undefined {
  if (value === undefined) return undefined;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a positive integer.`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a safe positive integer.`,
    );
  }
  return maximum ? Math.min(parsed, maximum) : parsed;
}

function booleanValue(
  value: string | undefined,
  parameter: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new QueryValidationError(
    parameter,
    `${parameter} must be either true or false.`,
  );
}

function nonNegativeNumber(
  value: string | undefined,
  parameter: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a finite, non-negative number.`,
    );
  }
  return parsed;
}

function dateValue(
  value: string | undefined,
  parameter: string,
): Date | undefined {
  if (value === undefined) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must use YYYY-MM-DD format.`,
    );
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime())
    || date.toISOString().slice(0, 10) !== value
  ) {
    throw new QueryValidationError(
      parameter,
      `${parameter} must be a valid calendar date.`,
    );
  }
  return date;
}

function successfulJson(value: unknown): Response {
  return Response.json(value, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

function invalidQuery(error: QueryValidationError): Response {
  return Response.json(
    {
      error: {
        code: "INVALID_QUERY",
        message: error.message,
        parameter: error.parameter,
      },
    },
    {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function handleSearchRequest(
  request: Request,
  service: SearchService,
): Promise<Response> {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.get("q")?.trim() ?? "";
    const type = oneOf(
      optionalString(searchParams, "type"),
      SEARCH_TYPES,
      "type",
    ) ?? "all";
    const page = positiveInteger(
      optionalString(searchParams, "page"),
      "page",
    );
    const pageSize = positiveInteger(
      optionalString(searchParams, "pageSize"),
      "pageSize",
      100,
    );
    const country = optionalString(searchParams, "country");
    const publicationStatus = oneOf(
      optionalString(searchParams, "publicationStatus"),
      PUBLICATION_STATUSES,
      "publicationStatus",
    );
    const sortBy = optionalString(searchParams, "sortBy");
    const sortDirection = oneOf(
      optionalString(searchParams, "sortDirection"),
      SORT_DIRECTIONS,
      "sortDirection",
    );
    const verificationStatus = oneOf(
      optionalString(searchParams, "verificationStatus"),
      VERIFICATION_STATUSES,
      "verificationStatus",
    );
    const verifiedOnly = booleanValue(
      optionalString(searchParams, "verifiedOnly"),
      "verifiedOnly",
    );
    const scholarshipAvailable = booleanValue(
      optionalString(searchParams, "scholarshipAvailable"),
      "scholarshipAvailable",
    );
    const tuitionMin = nonNegativeNumber(
      optionalString(searchParams, "tuitionMin"),
      "tuitionMin",
    );
    const tuitionMax = nonNegativeNumber(
      optionalString(searchParams, "tuitionMax"),
      "tuitionMax",
    );
    const minimumAward = nonNegativeNumber(
      optionalString(searchParams, "minimumAward"),
      "minimumAward",
    );
    const maximumAward = nonNegativeNumber(
      optionalString(searchParams, "maximumAward"),
      "maximumAward",
    );
    const deadlineFrom = dateValue(
      optionalString(searchParams, "deadlineFrom"),
      "deadlineFrom",
    );
    const deadlineTo = dateValue(
      optionalString(searchParams, "deadlineTo"),
      "deadlineTo",
    );
    const currentlyOpen = booleanValue(
      optionalString(searchParams, "currentlyOpen"),
      "currentlyOpen",
    );

    if (
      (type === "all" || type === "universities")
      && (sortBy || sortDirection)
    ) {
      throw new QueryValidationError(
        sortBy ? "sortBy" : "sortDirection",
        "Sorting is supported only for program or scholarship searches.",
      );
    }

    const shared = {
      query,
      page,
      pageSize,
      country,
    };

    if (type === "universities") {
      const filters: UniversitySearchFilters = {
        ...shared,
        state: optionalString(searchParams, "state"),
        city: optionalString(searchParams, "city"),
        publicationStatus,
        verificationStatus,
        verifiedOnly,
      };
      const result = await service.searchUniversities(filters);
      return successfulJson({ type, query, result });
    }

    if (type === "programs") {
      const filters: ProgramSearchFilters = {
        ...shared,
        universityId: optionalString(searchParams, "universityId"),
        degreeLevel: optionalString(searchParams, "degreeLevel"),
        campus: optionalString(searchParams, "campus"),
        intake: optionalString(searchParams, "intake"),
        scholarshipAvailable,
        tuitionMin,
        tuitionMax,
        sortBy: oneOf(sortBy, PROGRAM_SORT_FIELDS, "sortBy"),
        sortDirection,
      };
      const result = await service.searchPrograms(filters);
      return successfulJson({ type, query, result });
    }

    if (type === "scholarships") {
      const filters: ScholarshipSearchFilters = {
        ...shared,
        universityId: optionalString(searchParams, "universityId"),
        publicationStatus,
        scholarshipType: optionalString(searchParams, "scholarshipType"),
        minimumAward,
        maximumAward,
        deadlineFrom,
        deadlineTo,
        currentlyOpen,
        sortBy: oneOf(sortBy, SCHOLARSHIP_SORT_FIELDS, "sortBy"),
        sortDirection,
      };
      const result = await service.searchScholarships(filters);
      return successfulJson({ type, query, result });
    }

    const filters: SearchEverythingFilters = {
      ...shared,
      state: optionalString(searchParams, "state"),
      city: optionalString(searchParams, "city"),
      universityId: optionalString(searchParams, "universityId"),
      degreeLevel: optionalString(searchParams, "degreeLevel"),
      campus: optionalString(searchParams, "campus"),
      intake: optionalString(searchParams, "intake"),
      scholarshipAvailable,
      tuitionMin,
      tuitionMax,
      publicationStatus,
      verificationStatus,
      verifiedOnly,
      scholarshipType: optionalString(searchParams, "scholarshipType"),
      minimumAward,
      maximumAward,
      deadlineFrom,
      deadlineTo,
      currentlyOpen,
    };
    return successfulJson(await service.searchEverything(filters));
  } catch (error) {
    if (error instanceof QueryValidationError) return invalidQuery(error);
    console.error("University Intelligence search request failed.");
    return Response.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "The search request could not be completed.",
        },
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

const searchService = new UniversitySearchService(
  new UniversityRepository(),
  new ProgramRepository(),
  new ScholarshipRepository(),
);

export function GET(request: Request): Promise<Response> {
  return handleSearchRequest(request, searchService);
}
