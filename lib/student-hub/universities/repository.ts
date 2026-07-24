import type { CatalogIngestionMetadata } from "./ingestion";
import type {
  University,
  UniversityCountryCode,
  UniversityProgram,
  UniversityStudyLevel,
} from "./types";

export type CatalogQueryOptions = {
  includeInactive?: boolean;
};

export type CatalogProgramReference = {
  university: University;
  program: UniversityProgram;
};

export interface UniversityCatalogRepository {
  getCatalog(options?: CatalogQueryOptions): Promise<readonly University[]>;
  getAllUniversities(options?: CatalogQueryOptions): Promise<readonly University[]>;
  getUniversityBySlug(slug: string, options?: CatalogQueryOptions): Promise<University | undefined>;
  getProgramsByCountry(country: UniversityCountryCode, options?: CatalogQueryOptions): Promise<readonly CatalogProgramReference[]>;
  getProgramsByStudyLevel(studyLevel: UniversityStudyLevel, options?: CatalogQueryOptions): Promise<readonly CatalogProgramReference[]>;
  getProgramsBySubject(subject: string, options?: CatalogQueryOptions): Promise<readonly CatalogProgramReference[]>;
  getActivePrograms(): Promise<readonly CatalogProgramReference[]>;
  getFeaturedUniversities(options?: CatalogQueryOptions): Promise<readonly University[]>;
  getIngestionMetadata(): Promise<CatalogIngestionMetadata>;
}
