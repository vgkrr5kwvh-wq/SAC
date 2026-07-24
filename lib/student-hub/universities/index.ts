export { sampleUniversities } from "./data";
export {
  createLocalUniversityCatalogRepository,
  localUniversityCatalogRepository,
} from "./local-repository";
export {
  ingestUniversityCatalog,
  supportedCatalogSchemaVersions,
} from "./ingestion";
export {
  assessCatalogFreshness,
  defaultVerificationFreshnessPolicy,
  getVerificationFreshness,
  isVerificationStale,
} from "./freshness";
export { normalizeCatalogSubject, normalizeRawUniversityCatalog } from "./normalization";
export { CatalogIngestionError } from "./errors";
export {
  academicRequirementSchema,
  englishRequirementSchema,
  intakeSchema,
  parseUniversityCatalog,
  previousQualificationRequirementSchema,
  programSchema,
  safeParseUniversityCatalog,
  scholarshipSchema,
  tuitionSchema,
  universityCatalogRecordSchema,
  universityCatalogSchema,
  validateUniversityCatalogInvariants,
  verificationMetadataSchema,
} from "./schema";
export {
  getAllUniversities,
  getFeaturedUniversities,
  getUniversitiesByCountry,
  getUniversityBySlug,
} from "./queries";
export type {
  CurrencyCode,
  AcademicRequirement,
  EnglishTest,
  EnglishTestType,
  IntakeStatus,
  LocationClassification,
  PreviousQualificationRequirement,
  ProgramEnglishRequirement,
  ProgramIntake,
  ProgramScholarship,
  ProgramTuition,
  QualificationCompatibilityState,
  ScholarshipState,
  SubjectCoverage,
  TuitionPeriod,
  University,
  UniversityCountryCode,
  UniversityProgram,
  UniversityStudyLevel,
  VerificationMetadata,
  VerificationSourceType,
  VerificationStatus,
} from "./types";
export type { CatalogInvariantIssue, UniversityCatalog, UniversityCatalogInput } from "./schema";
export type {
  CatalogIngestionFailure,
  CatalogIngestionMetadata,
  CatalogIngestionResult,
  CatalogIngestionSuccess,
  IngestUniversityCatalogOptions,
  RawUniversityCatalogInput,
  SupportedCatalogSchemaVersion,
} from "./ingestion";
export type {
  CatalogFreshnessAssessment,
  VerificationFreshness,
  VerificationFreshnessPolicy,
} from "./freshness";
export type { CatalogIngestionIssue, CatalogIssueCode, CatalogIssueSeverity } from "./errors";
export type {
  CatalogProgramReference,
  CatalogQueryOptions,
  UniversityCatalogRepository,
} from "./repository";
