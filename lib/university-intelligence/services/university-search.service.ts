import type { ProgramRepository } from "../repositories/program.repository";
import type { ScholarshipRepository } from "../repositories/scholarship.repository";
import type { UniversityRepository } from "../repositories/university.repository";
import type { ProgramSearchFilters } from "../types/program";
import type { ScholarshipSearchFilters } from "../types/scholarship";
import type { UniversitySearchFilters } from "../types/university";

type UniversitySearchRepository = Pick<UniversityRepository, "search">;
type ProgramSearchRepository = Pick<ProgramRepository, "search">;
type ScholarshipSearchRepository = Pick<ScholarshipRepository, "search">;

export type SearchEverythingFilters = {
  query: string;
  page?: number;
  pageSize?: number;
  country?: string;
  universityId?: string;
  programId?: string;
  state?: string;
  city?: string;
  degreeLevel?: string;
  campus?: string;
  intake?: string;
  scholarshipType?: string;
  scholarshipAvailable?: boolean;
  tuitionMin?: number;
  tuitionMax?: number;
  minimumAward?: number;
  maximumAward?: number;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  currentlyOpen?: boolean;
  publishedOnly?: boolean;
  publicationStatus?: UniversitySearchFilters["publicationStatus"];
  verificationStatus?: UniversitySearchFilters["verificationStatus"];
  verifiedOnly?: boolean;
};

export type SearchEverythingResult = {
  universities: Awaited<ReturnType<UniversitySearchRepository["search"]>>;
  programs: Awaited<ReturnType<ProgramSearchRepository["search"]>>;
  scholarships: Awaited<ReturnType<ScholarshipSearchRepository["search"]>>;
  totalResults: number;
  query: string;
  executionTimeMs: number;
};

function normalizeOptionalFilters<T extends object>(filters: T): T {
  return Object.fromEntries(
    Object.entries(filters).flatMap(([key, value]) => {
      if (value === undefined) return [];
      if (typeof value !== "string") return [[key, value]];
      const trimmed = value.trim();
      return trimmed ? [[key, trimmed]] : [];
    }),
  ) as T;
}

function normalizeUniversityFilters(
  filters: UniversitySearchFilters,
): UniversitySearchFilters {
  return {
    ...normalizeOptionalFilters(filters),
    query: filters.query.trim(),
  };
}

function normalizeProgramFilters(
  filters: ProgramSearchFilters,
): ProgramSearchFilters {
  return {
    ...normalizeOptionalFilters(filters),
    query: filters.query.trim(),
  };
}

function normalizeScholarshipFilters(
  filters: ScholarshipSearchFilters,
): ScholarshipSearchFilters {
  return {
    ...normalizeOptionalFilters(filters),
    query: filters.query.trim(),
  };
}

export class UniversitySearchService {
  constructor(
    private readonly universityRepository: UniversitySearchRepository,
    private readonly programRepository: ProgramSearchRepository,
    private readonly scholarshipRepository: ScholarshipSearchRepository,
  ) {}

  searchUniversities(filters: UniversitySearchFilters) {
    return this.universityRepository.search(
      normalizeUniversityFilters(filters),
    );
  }

  searchPrograms(filters: ProgramSearchFilters) {
    return this.programRepository.search(normalizeProgramFilters(filters));
  }

  searchScholarships(filters: ScholarshipSearchFilters) {
    return this.scholarshipRepository.search(
      normalizeScholarshipFilters(filters),
    );
  }

  async searchEverything(
    filters: SearchEverythingFilters,
  ): Promise<SearchEverythingResult> {
    const startedAt = performance.now();
    const query = filters.query.trim();
    const shared = {
      query,
      page: filters.page,
      pageSize: filters.pageSize,
      country: filters.country,
    };

    const [universities, programs, scholarships] = await Promise.all([
      this.searchUniversities({
        ...shared,
        state: filters.state,
        city: filters.city,
        publicationStatus: filters.publicationStatus,
        verificationStatus: filters.verificationStatus,
        verifiedOnly: filters.verifiedOnly,
      }),
      this.searchPrograms({
        ...shared,
        universityId: filters.universityId,
        degreeLevel: filters.degreeLevel,
        campus: filters.campus,
        intake: filters.intake,
        scholarshipAvailable: filters.scholarshipAvailable,
        tuitionMin: filters.tuitionMin,
        tuitionMax: filters.tuitionMax,
        publishedOnly: filters.publishedOnly,
      }),
      this.searchScholarships({
        ...shared,
        universityId: filters.universityId,
        programId: filters.programId,
        publicationStatus: filters.publicationStatus,
        scholarshipType: filters.scholarshipType,
        minimumAward: filters.minimumAward,
        maximumAward: filters.maximumAward,
        deadlineFrom: filters.deadlineFrom,
        deadlineTo: filters.deadlineTo,
        currentlyOpen: filters.currentlyOpen,
        publishedOnly: filters.publishedOnly,
      }),
    ]);

    return {
      universities,
      programs,
      scholarships,
      totalResults:
        universities.pagination.totalItems
        + programs.pagination.totalItems
        + scholarships.pagination.totalItems,
      query,
      executionTimeMs: Math.max(0, performance.now() - startedAt),
    };
  }
}
