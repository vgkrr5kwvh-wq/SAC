import {
  UniversityPublicationStatus as PrismaUniversityPublicationStatus,
  VerificationStatus as PrismaVerificationStatus,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  mapUniversityToDetail,
  mapUniversityToSummary,
  universityDetailInclude,
  universitySummaryInclude,
} from "../mappers/university.mapper";
import type {
  PaginatedResult,
  UniversityDetail,
  UniversityManagementResult,
  UniversityManagementOverviewBase,
  UniversityManagementIdentity,
  UniversitySummary,
} from "../dto/university.dto";
import type {
  UniversityListFilters,
  UniversityManagementFilters,
  UniversitySearchFilters,
} from "../types/university";
import { universityDisplayName } from "../university-name";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type UniversityRepositoryClient = Pick<
  PrismaClient,
  "university" | "importRecord" | "universityFieldClaim" | "admissionRequirement" | "tuition" | "intake"
>;

function normalisePagination(page?: number, pageSize?: number) {
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

function normalizedFilter(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function buildWhere(
  filters: UniversityListFilters,
): Prisma.UniversityWhereInput {
  const publicationStatus =
    filters.publicationStatus ?? PrismaUniversityPublicationStatus.PUBLISHED;
  const country = normalizedFilter(filters.country);
  const state = normalizedFilter(filters.state);
  const city = normalizedFilter(filters.city);
  const verifiedStatuses = [
    PrismaVerificationStatus.OFFICIAL_VERIFIED,
    PrismaVerificationStatus.MANUALLY_VERIFIED,
  ];
  const verificationStatus = filters.verifiedOnly
    ? {
        ...(filters.verificationStatus
          ? { equals: filters.verificationStatus }
          : {}),
        in: verifiedStatuses,
      }
    : filters.verificationStatus;

  return {
    publicationStatus,
    ...(country
      ? {
          country: {
            equals: country,
          },
        }
      : {}),
    ...(state
      ? {
          state: {
            equals: state,
          },
        }
      : {}),
    ...(city
      ? {
          city: {
            equals: city,
          },
        }
      : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
  };
}

export class UniversityRepository {
  constructor(
    private readonly client: UniversityRepositoryClient = prisma,
  ) {}

  async getById(
    id: string,
    options: Pick<UniversityListFilters, "publicationStatus"> = {},
  ): Promise<UniversityDetail | null> {
    const university = await this.client.university.findFirst({
      where: {
        id,
        publicationStatus:
          options.publicationStatus ??
          PrismaUniversityPublicationStatus.PUBLISHED,
      },
      include: universityDetailInclude,
    });

    return university ? mapUniversityToDetail(university) : null;
  }

  async getBySlug(
    slug: string,
    options: Pick<UniversityListFilters, "publicationStatus"> = {},
  ): Promise<UniversityDetail | null> {
    const university = await this.client.university.findFirst({
      where: {
        slug,
        publicationStatus:
          options.publicationStatus ??
          PrismaUniversityPublicationStatus.PUBLISHED,
      },
      include: universityDetailInclude,
    });

    return university ? mapUniversityToDetail(university) : null;
  }

  async getManagementIdentityById(id: string): Promise<UniversityManagementIdentity | null> {
    const normalizedId = id.trim();
    if (!normalizedId) return null;
    const university = await this.client.university.findUnique({
      where: { id: normalizedId },
      select: { id: true, name: true },
    });
    return university ? { ...university, name: universityDisplayName(university.name) } : null;
  }

  async getManagementOverviewById(
    id: string,
  ): Promise<UniversityManagementOverviewBase | null> {
    const normalizedId = id.trim();
    if (!normalizedId) return null;
    const university = await this.client.university.findUnique({
      where: { id: normalizedId },
      include: {
        ...universityDetailInclude,
        sources: {
          select: {
            id: true,
            sourceName: true,
            sourceUniversityUrl: true,
            isPrimary: true,
            lastCheckedAt: true,
            lastSuccessfulSyncAt: true,
          },
          orderBy: [{ isPrimary: "desc" }, { sourceName: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!university) return null;

    const [pendingRecords, pendingClaims, latestImport, latestReview, admissionRequirements, tuitionRecords, intakes, claims, history] = await Promise.all([
      this.client.importRecord.count({
        where: { universityId: normalizedId, status: { in: ["STAGED", "MANUAL_REVIEW"] } },
      }),
      this.client.universityFieldClaim.count({
        where: { universityId: normalizedId, conflictStatus: "CONFLICT_REVIEW" },
      }),
      this.client.importRecord.findFirst({
        where: { universityId: normalizedId },
        select: {
          status: true,
          createdAt: true,
          importJob: { select: { status: true, createdAt: true, sourceName: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      this.client.importRecord.findFirst({
        where: { universityId: normalizedId, reviewedAt: { not: null } },
        select: {
          status: true,
          reviewedAt: true,
          reviewedBy: { select: { name: true, email: true } },
        },
        orderBy: [{ reviewedAt: "desc" }, { id: "desc" }],
      }),
      this.client.admissionRequirement.count({ where: { universityId: normalizedId } }),
      this.client.tuition.count({ where: { universityId: normalizedId } }),
      this.client.intake.count({ where: { universityId: normalizedId } }),
      this.client.universityFieldClaim.count({ where: { universityId: normalizedId } }),
      this.client.importRecord.count({ where: { universityId: normalizedId } }),
    ]);
    const { sources, ...universityPayload } = university;

    return {
      university: mapUniversityToDetail(universityPayload),
      sources: sources.map((source) => ({
        id: source.id,
        name: source.sourceName,
        url: source.sourceUniversityUrl,
        isPrimary: source.isPrimary,
        lastCheckedAt: source.lastCheckedAt,
        lastSuccessfulSyncAt: source.lastSuccessfulSyncAt,
      })),
      pendingReviewItems: pendingRecords + pendingClaims,
      latestImport: latestImport ? {
        recordStatus: latestImport.status,
        recordCreatedAt: latestImport.createdAt,
        jobStatus: latestImport.importJob.status,
        jobCreatedAt: latestImport.importJob.createdAt,
        sourceName: latestImport.importJob.sourceName,
      } : null,
      latestReview: latestReview?.reviewedAt ? {
        status: latestReview.status,
        reviewedAt: latestReview.reviewedAt,
        reviewer: latestReview.reviewedBy?.name ?? latestReview.reviewedBy?.email ?? "Former administrator",
      } : null,
      tabCounts: {
        admissionRequirements,
        tuitionRecords,
        intakes,
        claims,
        sources: sources.length,
        history,
      },
    };
  }

  async list(
    filters: UniversityListFilters = {},
  ): Promise<PaginatedResult<UniversitySummary>> {
    const { page, pageSize, skip } = normalisePagination(
      filters.page,
      filters.pageSize,
    );

    const where = buildWhere(filters);

    const [universities, totalItems] = await Promise.all([
      this.client.university.findMany({
        where,
        include: universitySummaryInclude,
        orderBy: {
          name: "asc",
        },
        skip,
        take: pageSize,
      }),
      this.client.university.count({
        where,
      }),
    ]);

    return {
      items: universities.map(mapUniversityToSummary),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async search(
    filters: UniversitySearchFilters,
  ): Promise<PaginatedResult<UniversitySummary>> {
    const query = filters.query.trim();

    const { page, pageSize, skip } = normalisePagination(
      filters.page,
      filters.pageSize,
    );

    const baseWhere = buildWhere(filters);

    const where: Prisma.UniversityWhereInput = query
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                {
                  name: {
                    contains: query,
                  },
                },
                {
                  city: {
                    contains: query,
                  },
                },
                {
                  state: {
                    contains: query,
                  },
                },
                {
                  country: {
                    contains: query,
                  },
                },
                {
                  aliases: {
                    some: {
                      name: {
                        contains: query,
                      },
                    },
                  },
                },
              ],
            },
          ],
        }
      : baseWhere;

    const [universities, totalItems] = await Promise.all([
      this.client.university.findMany({
        where,
        include: universitySummaryInclude,
        orderBy: {
          name: "asc",
        },
        skip,
        take: pageSize,
      }),
      this.client.university.count({
        where,
      }),
    ]);

    return {
      items: universities.map(mapUniversityToSummary),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async listForManagement(
    filters: UniversityManagementFilters = {},
  ): Promise<UniversityManagementResult> {
    const query = normalizedFilter(filters.query);
    const country = normalizedFilter(filters.country);
    const where: Prisma.UniversityWhereInput = {
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { city: { contains: query } },
              { state: { contains: query } },
              { country: { contains: query } },
              { aliases: { some: { name: { contains: query } } } },
            ],
          }
        : {}),
      ...(country ? { country: { equals: country } } : {}),
      ...(filters.publicationStatus
        ? { publicationStatus: filters.publicationStatus }
        : {}),
      ...(filters.verificationStatus
        ? { verificationStatus: filters.verificationStatus }
        : {}),
    };

    const [universities, total, published, draft, pendingReview, officiallyVerified, countryRows] = await Promise.all([
      this.client.university.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          country: true,
          state: true,
          city: true,
          institutionType: true,
          foundedYear: true,
          officialWebsiteUrl: true,
          logoUrl: true,
          publicationStatus: true,
          verificationStatus: true,
          updatedAt: true,
          programs: { select: { publicationStatus: true, active: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      }),
      this.client.university.count(),
      this.client.university.count({ where: { publicationStatus: PrismaUniversityPublicationStatus.PUBLISHED } }),
      this.client.university.count({ where: { publicationStatus: PrismaUniversityPublicationStatus.DRAFT } }),
      this.client.university.count({ where: { importRecords: { some: { status: { in: ["STAGED", "MANUAL_REVIEW"] } } } } }),
      this.client.university.count({ where: { verificationStatus: PrismaVerificationStatus.OFFICIAL_VERIFIED } }),
      this.client.university.findMany({
        where: { country: { not: null } },
        select: { country: true },
        distinct: ["country"],
        orderBy: { country: "asc" },
      }),
    ]);

    return {
      universities: universities.map((university) => {
        const { programs, ...summary } = university;
        return {
          ...summary,
          programCount: programs.filter((program) =>
            program.active && program.publicationStatus === PrismaUniversityPublicationStatus.PUBLISHED
          ).length,
          totalProgramCount: programs.length,
        };
      }),
      statistics: { total, published, draft, pendingReview, officiallyVerified },
      countries: countryRows.flatMap(({ country: value }) => value ? [value] : []),
    };
  }
}
