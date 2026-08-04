import type { UniversityPublicationStatus, UniversityVerificationStatus } from "./university";
export type TuitionScope = "university-wide" | "program-specific";
export type TuitionManagementFilters = { query?: string; studyLevel?: string; degreeLevel?: string; programId?: string; currency?: string; period?: string; academicYear?: string; publicationStatus?: UniversityPublicationStatus; verificationStatus?: UniversityVerificationStatus; scope?: TuitionScope };
