export {
  ScholarshipRepository,
} from "./repositories/scholarship.repository";
export { AdmissionRequirementRepository } from "./repositories/admission-requirement.repository";
export {
  UniversitySearchService,
} from "./services/university-search.service";
export {
  UniversityManagementService,
  type UniversityManagementOverviewRepositories,
} from "./services/university-management.service";
export {
  ProgramManagementService,
  type ProgramManagementRepositories,
  type UniversityProgramManagementResult,
} from "./services/program-management.service";
export {
  ScholarshipManagementService,
  type ScholarshipManagementRepositories,
  type UniversityScholarshipManagementResult,
} from "./services/scholarship-management.service";
export {
  AdmissionRequirementManagementService,
  type AdmissionRequirementManagementRepositories,
  type UniversityAdmissionRequirementManagementResult,
} from "./services/admission-requirement-management.service";
export {
  ProgramRepository,
} from "./repositories/program.repository";
export {
  UniversityRepository,
} from "./repositories/university.repository";
export type {
  ScholarshipCard,
  ScholarshipDetail,
  ScholarshipProgramSummary,
  ScholarshipSearchResult,
  ScholarshipManagementResult,
  ScholarshipManagementSummary,
  ScholarshipSummary,
  ScholarshipUniversitySummary,
} from "./dto/scholarship.dto";
export type {
  AdmissionRequirementManagementResult,
  AdmissionRequirementManagementSummary,
} from "./dto/admission-requirement.dto";
export type {
  ProgramCard,
  ProgramDetail,
  ProgramIntake,
  ProgramScholarship,
  ProgramSearchResult,
  ProgramManagementResult,
  ProgramManagementSummary,
  ProgramSummary,
  ProgramTuition,
  ProgramUniversitySummary,
} from "./dto/program.dto";
export type {
  ScholarshipListFilters,
  ScholarshipAvailabilityFilter,
  ScholarshipManagementFilters,
  ScholarshipScopeFilter,
  ScholarshipSearchFilters,
  ScholarshipSortBy,
  ScholarshipSortDirection,
} from "./types/scholarship";
export type {
  AdmissionRequirementManagementFilters,
  AdmissionRequirementScope,
} from "./types/admission-requirement";
export type {
  SearchEverythingFilters,
  SearchEverythingResult,
} from "./services/university-search.service";
export type {
  ProgramIdentityOptions,
  ProgramListFilters,
  ProgramManagementFilters,
  ProgramSearchFilters,
  ProgramSortBy,
  SortDirection,
} from "./types/program";
export type {
  PaginatedResult,
  PaginationMetadata,
  UniversityAdmissionRequirement,
  UniversityDetail,
  UniversityManagementResult,
  UniversityManagementImportActivity,
  UniversityManagementIdentity,
  UniversityManagementOverview,
  UniversityManagementOverviewBase,
  UniversityManagementReviewActivity,
  UniversityManagementSource,
  UniversityManagementStatistics,
  UniversityManagementSummary,
  UniversityPublicLink,
  UniversitySummary,
} from "./dto/university.dto";
export type {
  UniversityListFilters,
  UniversityManagementFilters,
  UniversityPublicationStatus,
  UniversitySearchFilters,
  UniversityVerificationStatus,
} from "./types/university";
