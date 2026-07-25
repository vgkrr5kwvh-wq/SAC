import {
  ScholarshipAvailability,
  UniversityPublicationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  PaginatedResult,
} from "../dto/university.dto";
import type {
  ProgramCard,
  ProgramDetail,
  ProgramSearchResult,
} from "../dto/program.dto";
import {
  mapProgramToCard,
  mapProgramToDetail,
  mapProgramToSearchResult,
  programSelect,
} from "../mappers/program.mapper";
import type {
  ProgramIdentityOptions,
  ProgramListFilters,
  ProgramSearchFilters,
  ProgramSortBy,
  SortDirection,
} from "../types/program";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ProgramRepositoryClient = Pick<PrismaClient, "program">;

function normalizedString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizedMoney(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
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

function buildWhere(filters: ProgramListFilters): Prisma.ProgramWhereInput {
  const universityId = normalizedString(filters.universityId);
  const country = normalizedString(filters.country);
  const degreeLevel = normalizedString(filters.degreeLevel);
  const campus = normalizedString(filters.campus);
  const intake = normalizedString(filters.intake);
  const tuitionMin = normalizedMoney(filters.tuitionMin);
  const tuitionMax = normalizedMoney(filters.tuitionMax);
  const tuitionRange = tuitionMin !== undefined || tuitionMax !== undefined
    ? {
        amount: {
          ...(tuitionMin !== undefined ? { gte: tuitionMin } : {}),
          ...(tuitionMax !== undefined ? { lte: tuitionMax } : {}),
        },
      }
    : undefined;

  return {
    ...(filters.publishedOnly !== false
      ? { publicationStatus: UniversityPublicationStatus.PUBLISHED }
      : {}),
    ...(universityId ? { universityId } : {}),
    ...(country
      ? { university: { country: { equals: country } } }
      : {}),
    ...(degreeLevel ? { degreeLevel: { equals: degreeLevel } } : {}),
    ...(campus ? { campus: { equals: campus } } : {}),
    ...(intake ? { intakes: { some: { term: { equals: intake } } } } : {}),
    ...(filters.scholarshipAvailable === true
      ? {
          scholarships: {
            some: {
              scholarshipAvailable: ScholarshipAvailability.AVAILABLE,
              publicationStatus: UniversityPublicationStatus.PUBLISHED,
            },
          },
        }
      : {}),
    ...(filters.scholarshipAvailable === false
      ? {
          scholarships: {
            none: {
              scholarshipAvailable: ScholarshipAvailability.AVAILABLE,
              publicationStatus: UniversityPublicationStatus.PUBLISHED,
            },
          },
        }
      : {}),
    ...(tuitionRange ? { tuitionRecords: { some: tuitionRange } } : {}),
  };
}

function buildOrderBy(
  sortBy: ProgramSortBy = "name",
  sortDirection: SortDirection = "asc",
): Prisma.ProgramOrderByWithRelationInput[] {
  const primary: Prisma.ProgramOrderByWithRelationInput = sortBy === "universityName"
    ? { university: { name: sortDirection } }
    : { [sortBy]: sortDirection };
  return [primary, { id: "asc" }];
}

export class ProgramRepository {
  constructor(
    private readonly client: ProgramRepositoryClient = prisma,
  ) {}

  async getById(
    id: string,
    options: Pick<ProgramIdentityOptions, "publishedOnly"> = {},
  ): Promise<ProgramDetail | null> {
    const program = await this.client.program.findFirst({
      where: {
        id,
        ...(options.publishedOnly !== false
          ? { publicationStatus: UniversityPublicationStatus.PUBLISHED }
          : {}),
      },
      select: programSelect,
    });
    return program ? mapProgramToDetail(program) : null;
  }

  async getBySlug(
    slug: string,
    options: ProgramIdentityOptions = {},
  ): Promise<ProgramDetail | null> {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) return null;
    const program = await this.client.program.findFirst({
      where: {
        slug: normalizedSlug,
        ...(normalizedString(options.universityId)
          ? { universityId: normalizedString(options.universityId) }
          : {}),
        ...(options.publishedOnly !== false
          ? { publicationStatus: UniversityPublicationStatus.PUBLISHED }
          : {}),
      },
      select: programSelect,
      orderBy: [
        { university: { name: "asc" } },
        { id: "asc" },
      ],
    });
    return program ? mapProgramToDetail(program) : null;
  }

  async list(
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.listWithWhere(buildWhere(filters), filters);
  }

  async search(
    filters: ProgramSearchFilters,
  ): Promise<PaginatedResult<ProgramSearchResult>> {
    const query = filters.query.trim();
    const baseWhere = buildWhere(filters);
    const where: Prisma.ProgramWhereInput = query
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { name: { contains: query } },
                { degreeLevel: { contains: query } },
                { studyLevel: { contains: query } },
                { subjectArea: { contains: query } },
                { department: { contains: query } },
                { university: { name: { contains: query } } },
              ],
            },
          ],
        }
      : baseWhere;
    const result = await this.query(where, filters);
    return {
      items: result.items.map((program) =>
        mapProgramToSearchResult(program, query)
      ),
      pagination: result.pagination,
    };
  }

  listByUniversity(
    universityId: string,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, universityId });
  }

  listByCountry(
    country: string,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, country });
  }

  listByDegree(
    degreeLevel: string,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, degreeLevel });
  }

  listByIntake(
    intake: string,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, intake });
  }

  listByScholarship(
    scholarshipAvailable = true,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, scholarshipAvailable });
  }

  listByTuitionRange(
    tuitionMin: number | undefined,
    tuitionMax: number | undefined,
    filters: ProgramListFilters = {},
  ): Promise<PaginatedResult<ProgramCard>> {
    return this.list({ ...filters, tuitionMin, tuitionMax });
  }

  private async listWithWhere(
    where: Prisma.ProgramWhereInput,
    filters: ProgramListFilters,
  ): Promise<PaginatedResult<ProgramCard>> {
    const result = await this.query(where, filters);
    return {
      items: result.items.map(mapProgramToCard),
      pagination: result.pagination,
    };
  }

  private async query(
    where: Prisma.ProgramWhereInput,
    filters: ProgramListFilters,
  ) {
    const { page, pageSize, skip } = normalizePagination(
      filters.page,
      filters.pageSize,
    );
    const [items, totalItems] = await Promise.all([
      this.client.program.findMany({
        where,
        select: programSelect,
        orderBy: buildOrderBy(filters.sortBy, filters.sortDirection),
        skip,
        take: pageSize,
      }),
      this.client.program.count({ where }),
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
