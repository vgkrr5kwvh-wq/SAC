import {
  ScholarshipAvailability,
  UniversityPublicationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  ScholarshipCard,
  ScholarshipDetail,
  ScholarshipSearchResult,
  ScholarshipManagementResult,
} from "../dto/scholarship.dto";
import type {
  PaginatedResult,
} from "../dto/university.dto";
import {
  mapScholarshipToCard,
  mapScholarshipToDetail,
  mapScholarshipToSearchResult,
  mapScholarshipToManagementSummary,
  parseScholarshipDeadline,
  scholarshipSelect,
  type ScholarshipRepositoryPayload,
} from "../mappers/scholarship.mapper";
import type {
  ScholarshipListFilters,
  ScholarshipManagementFilters,
  ScholarshipSearchFilters,
  ScholarshipSortBy,
  ScholarshipSortDirection,
} from "../types/scholarship";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ScholarshipRepositoryClient = Pick<PrismaClient, "scholarship">;

function normalizedString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizedMoney(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function validDate(value: Date | undefined): Date | undefined {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : undefined;
}

function normalizePagination(page?: number, pageSize?: number) {
  const safePage = Number.isInteger(page) && Number(page) > 0
    ? Number(page)
    : DEFAULT_PAGE;
  const requestedPageSize = Number.isInteger(pageSize) && Number(pageSize) > 0
    ? Number(pageSize)
    : DEFAULT_PAGE_SIZE;
  const safePageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
  };
}

function awardRangeWhere(
  minimumAward: number | undefined,
  maximumAward: number | undefined,
): Prisma.ScholarshipWhereInput[] {
  const conditions: Prisma.ScholarshipWhereInput[] = [];
  if (minimumAward !== undefined) {
    conditions.push({
      OR: [
        { maximumAmount: { gte: minimumAward } },
        {
          AND: [
            { maximumAmount: null },
            { minimumAmount: { gte: minimumAward } },
          ],
        },
      ],
    });
  }
  if (maximumAward !== undefined) {
    conditions.push({
      OR: [
        { minimumAmount: { lte: maximumAward } },
        {
          AND: [
            { minimumAmount: null },
            { maximumAmount: { lte: maximumAward } },
          ],
        },
      ],
    });
  }
  return conditions;
}

function buildWhere(
  filters: ScholarshipListFilters,
): Prisma.ScholarshipWhereInput {
  const universityId = normalizedString(filters.universityId);
  const programId = normalizedString(filters.programId);
  const country = normalizedString(filters.country);
  const scholarshipType = normalizedString(filters.scholarshipType);
  const studyLevel = normalizedString(filters.studyLevel);
  const minimumAward = normalizedMoney(filters.minimumAward);
  const maximumAward = normalizedMoney(filters.maximumAward);
  const publicationStatus = filters.publicationStatus
    ?? (filters.publishedOnly !== false
      ? UniversityPublicationStatus.PUBLISHED
      : undefined);
  const rangeConditions = awardRangeWhere(minimumAward, maximumAward);

  return {
    ...(publicationStatus ? { publicationStatus } : {}),
    ...(universityId ? { universityId } : {}),
    ...(programId ? { programId } : {}),
    ...(country
      ? { university: { country: { equals: country } } }
      : {}),
    ...(scholarshipType
      ? { scholarshipType: { equals: scholarshipType } }
      : {}),
    ...(studyLevel ? { studyLevel: { equals: studyLevel } } : {}),
    ...(filters.availability ? { scholarshipAvailable: filters.availability } : {}),
    ...(filters.scope === "university-wide" ? { programId: null } : {}),
    ...(filters.scope === "program-specific" ? { programId: { not: null } } : {}),
    ...(filters.verificationStatus ? { verificationStatus: filters.verificationStatus } : {}),
    ...(rangeConditions.length ? { AND: rangeConditions } : {}),
  };
}

function withScholarshipSearch(
  where: Prisma.ScholarshipWhereInput,
  queryValue: string | undefined,
): Prisma.ScholarshipWhereInput {
  const query = normalizedString(queryValue);
  return query ? { AND: [where, { OR: [
    { name: { contains: query } },
    { scholarshipType: { contains: query } },
    { eligibilityText: { contains: query } },
    { amountText: { contains: query } },
    { studyLevel: { contains: query } },
    { university: { name: { contains: query } } },
    { program: { name: { contains: query } } },
  ] }] } : where;
}

function buildOrderBy(
  sortBy: ScholarshipSortBy = "name",
  sortDirection: ScholarshipSortDirection = "asc",
): Prisma.ScholarshipOrderByWithRelationInput[] {
  const primary: Prisma.ScholarshipOrderByWithRelationInput =
    sortBy === "universityName"
      ? { university: { name: sortDirection } }
      : { [sortBy]: sortDirection };
  return [primary, { id: "asc" }];
}

function deadlineMatches(
  scholarship: ScholarshipRepositoryPayload,
  filters: ScholarshipListFilters,
  referenceDate = new Date(),
): boolean {
  const deadline = parseScholarshipDeadline(scholarship.deadlineText);
  const from = validDate(filters.deadlineFrom);
  const to = validDate(filters.deadlineTo);
  if (filters.currentlyOpen !== undefined) {
    if (!deadline) return false;
    const open = deadline.getTime() >= referenceDate.getTime();
    if (open !== filters.currentlyOpen) return false;
  }
  if (from && (!deadline || deadline.getTime() < from.getTime())) return false;
  if (to && (!deadline || deadline.getTime() > to.getTime())) return false;
  return true;
}

function requiresDeadlineFiltering(filters: ScholarshipListFilters): boolean {
  return filters.currentlyOpen !== undefined
    || validDate(filters.deadlineFrom) !== undefined
    || validDate(filters.deadlineTo) !== undefined;
}

export class ScholarshipRepository {
  constructor(
    private readonly client: ScholarshipRepositoryClient = prisma,
  ) {}

  async getById(
    id: string,
    filters: Pick<
      ScholarshipListFilters,
      "publicationStatus" | "publishedOnly"
    > = {},
  ): Promise<ScholarshipDetail | null> {
    const publicationStatus = filters.publicationStatus
      ?? (filters.publishedOnly !== false
        ? UniversityPublicationStatus.PUBLISHED
        : undefined);
    const scholarship = await this.client.scholarship.findFirst({
      where: {
        id,
        ...(publicationStatus ? { publicationStatus } : {}),
      },
      select: scholarshipSelect,
    });
    return scholarship ? mapScholarshipToDetail(scholarship) : null;
  }

  list(
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.listWithWhere(buildWhere(filters), filters);
  }

  async search(
    filters: ScholarshipSearchFilters,
  ): Promise<PaginatedResult<ScholarshipSearchResult>> {
    const query = filters.query.trim();
    const where = withScholarshipSearch(buildWhere(filters), query);
    const result = await this.query(where, filters);
    return {
      items: result.items.map((scholarship) =>
        mapScholarshipToSearchResult(scholarship, query)
      ),
      pagination: result.pagination,
    };
  }

  async listForManagement(
    universityId: string,
    filters: ScholarshipManagementFilters = {},
  ): Promise<ScholarshipManagementResult> {
    const baseFilters: ScholarshipListFilters = {
      universityId,
      publishedOnly: false,
      availability: filters.availability,
      scholarshipType: filters.scholarshipType,
      studyLevel: filters.studyLevel,
      scope: filters.scope,
      publicationStatus: filters.publicationStatus,
      verificationStatus: filters.verificationStatus,
    };
    const where = withScholarshipSearch(buildWhere(baseFilters), filters.query);
    const [scholarships, total, published, draft, available, unavailable, unknown, universityWide, programSpecific, typeRows, levelRows] = await Promise.all([
      this.client.scholarship.findMany({ where, select: scholarshipSelect, orderBy: [{ name: "asc" }, { id: "asc" }], take: MAX_PAGE_SIZE }),
      this.client.scholarship.count({ where: { universityId } }),
      this.client.scholarship.count({ where: { universityId, publicationStatus: UniversityPublicationStatus.PUBLISHED } }),
      this.client.scholarship.count({ where: { universityId, publicationStatus: UniversityPublicationStatus.DRAFT } }),
      this.client.scholarship.count({ where: { universityId, scholarshipAvailable: ScholarshipAvailability.AVAILABLE } }),
      this.client.scholarship.count({ where: { universityId, scholarshipAvailable: ScholarshipAvailability.UNAVAILABLE } }),
      this.client.scholarship.count({ where: { universityId, scholarshipAvailable: ScholarshipAvailability.UNKNOWN } }),
      this.client.scholarship.count({ where: { universityId, programId: null } }),
      this.client.scholarship.count({ where: { universityId, programId: { not: null } } }),
      this.client.scholarship.findMany({ where: { universityId, scholarshipType: { not: null } }, select: { scholarshipType: true }, distinct: ["scholarshipType"], orderBy: { scholarshipType: "asc" } }),
      this.client.scholarship.findMany({ where: { universityId, studyLevel: { not: null } }, select: { studyLevel: true }, distinct: ["studyLevel"], orderBy: { studyLevel: "asc" } }),
    ]);
    return {
      scholarships: scholarships.map(mapScholarshipToManagementSummary),
      statistics: { total, published, draft, available, unavailable, unknown, universityWide, programSpecific },
      options: {
        scholarshipTypes: typeRows.flatMap(({ scholarshipType }) => scholarshipType ? [scholarshipType] : []),
        studyLevels: levelRows.flatMap(({ studyLevel }) => studyLevel ? [studyLevel] : []),
      },
    };
  }

  listByUniversity(
    universityId: string,
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({ ...filters, universityId });
  }

  listByProgram(
    programId: string,
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({ ...filters, programId });
  }

  listByCountry(
    country: string,
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({ ...filters, country });
  }

  listPublished(
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({
      ...filters,
      publicationStatus: UniversityPublicationStatus.PUBLISHED,
    });
  }

  listCurrentlyOpen(
    referenceDate = new Date(),
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    const safeReference = validDate(referenceDate) ?? new Date();
    return this.listWithWhere(
      buildWhere({ ...filters, currentlyOpen: true }),
      { ...filters, currentlyOpen: true },
      safeReference,
    );
  }

  listByAwardRange(
    minimum: number | undefined,
    maximum: number | undefined,
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({
      ...filters,
      minimumAward: minimum,
      maximumAward: maximum,
    });
  }

  listByDeadlineRange(
    startDate: Date,
    endDate: Date,
    filters: ScholarshipListFilters = {},
  ): Promise<PaginatedResult<ScholarshipCard>> {
    return this.list({
      ...filters,
      deadlineFrom: startDate,
      deadlineTo: endDate,
    });
  }

  private async listWithWhere(
    where: Prisma.ScholarshipWhereInput,
    filters: ScholarshipListFilters,
    referenceDate = new Date(),
  ): Promise<PaginatedResult<ScholarshipCard>> {
    const result = await this.query(where, filters, referenceDate);
    return {
      items: result.items.map(mapScholarshipToCard),
      pagination: result.pagination,
    };
  }

  private async query(
    where: Prisma.ScholarshipWhereInput,
    filters: ScholarshipListFilters,
    referenceDate = new Date(),
  ) {
    const { page, pageSize, skip } = normalizePagination(
      filters.page,
      filters.pageSize,
    );
    const orderBy = buildOrderBy(filters.sortBy, filters.sortDirection);
    if (requiresDeadlineFiltering(filters)) {
      const candidates = await this.client.scholarship.findMany({
        where,
        select: scholarshipSelect,
        orderBy,
      });
      const matching = candidates.filter((scholarship) =>
        deadlineMatches(scholarship, filters, referenceDate)
      );
      return {
        items: matching.slice(skip, skip + pageSize),
        pagination: {
          page,
          pageSize,
          totalItems: matching.length,
          totalPages: Math.ceil(matching.length / pageSize),
        },
      };
    }
    const [items, totalItems] = await Promise.all([
      this.client.scholarship.findMany({
        where,
        select: scholarshipSelect,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.client.scholarship.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }
}
