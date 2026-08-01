import type { UniversityPublicationStatus, UniversityVerificationStatus } from "./university";

export type AdmissionRequirementScope = "university-wide" | "program-specific";

export type AdmissionRequirementManagementFilters = {
  query?: string;
  studyLevel?: string;
  degreeLevel?: string;
  programId?: string;
  publicationStatus?: UniversityPublicationStatus;
  verificationStatus?: UniversityVerificationStatus;
  scope?: AdmissionRequirementScope;
};
