import { rawSampleUniversityCatalog } from "./data";
import { CatalogIngestionError } from "./errors";
import {
  ingestUniversityCatalog,
  type CatalogIngestionSuccess,
} from "./ingestion";
import { normalizeCatalogSubject } from "./normalization";
import type {
  CatalogProgramReference,
  CatalogQueryOptions,
  UniversityCatalogRepository,
} from "./repository";
import type { University } from "./types";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach((nested) => deepFreeze(nested));
  return value;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en", { sensitivity: "base" });
}

function sortUniversities(universities: readonly University[]): readonly University[] {
  return [...universities].sort((left, right) =>
    compareText(left.name, right.name) || compareText(left.slug, right.slug)
  );
}

function sortProgramReferences(references: readonly CatalogProgramReference[]): readonly CatalogProgramReference[] {
  return [...references].sort((left, right) =>
    compareText(left.university.name, right.university.name)
    || compareText(left.program.name, right.program.name)
    || compareText(left.university.slug, right.university.slug)
    || compareText(left.program.slug, right.program.slug)
  );
}

export type LocalUniversityCatalogRepositoryOptions = {
  rawCatalog?: unknown;
  referenceDate?: Date;
};

export function createLocalUniversityCatalogRepository(
  options: LocalUniversityCatalogRepositoryOptions = {},
): UniversityCatalogRepository {
  const rawCatalog = options.rawCatalog ?? rawSampleUniversityCatalog;
  const referenceDate = options.referenceDate ?? new Date();
  let cachedIngestion: Promise<CatalogIngestionSuccess> | null = null;

  const load = (): Promise<CatalogIngestionSuccess> => {
    if (cachedIngestion) return cachedIngestion;
    cachedIngestion = Promise.resolve().then(() => {
      const result = ingestUniversityCatalog(rawCatalog, { referenceDate });
      if (!result.success) throw new CatalogIngestionError(result.errors);
      return deepFreeze(result);
    });
    return cachedIngestion;
  };

  const universities = async (queryOptions: CatalogQueryOptions = {}) => {
    const result = await load();
    const activeUniversities = queryOptions.includeInactive
      ? result.catalog
      : result.catalog.filter((university) => university.active);
    const filtered = queryOptions.includeInactive
      ? activeUniversities
      : activeUniversities.map((university) => ({
          ...university,
          programs: university.programs.filter((program) => program.active),
        }));
    return deepFreeze(sortUniversities(filtered));
  };

  const programs = async (queryOptions: CatalogQueryOptions = {}) => {
    const catalog = await universities(queryOptions);
    const references = catalog.flatMap((university) =>
      university.programs
        .filter((program) => queryOptions.includeInactive || program.active)
        .map((program) => ({ university, program }))
    );
    return deepFreeze(sortProgramReferences(references));
  };

  return {
    getCatalog: universities,
    getAllUniversities: universities,
    async getUniversityBySlug(slug, queryOptions) {
      const normalizedSlug = slug.trim().toLowerCase();
      return (await universities(queryOptions)).find((university) => university.slug === normalizedSlug);
    },
    async getProgramsByCountry(country, queryOptions) {
      return deepFreeze((await programs(queryOptions)).filter((reference) => reference.university.country === country));
    },
    async getProgramsByStudyLevel(studyLevel, queryOptions) {
      return deepFreeze((await programs(queryOptions)).filter((reference) => reference.program.studyLevel === studyLevel));
    },
    async getProgramsBySubject(subject, queryOptions) {
      const normalized = normalizeCatalogSubject(subject);
      return deepFreeze((await programs(queryOptions)).filter((reference) =>
        [reference.program.subject, ...reference.program.subjectAliases]
          .some((candidate) => normalizeCatalogSubject(candidate) === normalized)
      ));
    },
    async getActivePrograms() {
      return programs();
    },
    async getFeaturedUniversities(queryOptions) {
      return deepFreeze((await universities(queryOptions)).filter((university) => university.featured));
    },
    async getIngestionMetadata() {
      return (await load()).metadata;
    },
  };
}

export const localUniversityCatalogRepository = createLocalUniversityCatalogRepository();
