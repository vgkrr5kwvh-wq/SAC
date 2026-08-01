import type {
  UniversityPublicationStatus,
  UniversityVerificationStatus,
} from "./university";

export type ScholarshipAvailabilityFilter = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
export type ScholarshipScopeFilter = "university-wide" | "program-specific";

export type ScholarshipSortBy =
  | "name"
  | "minimumAmount"
  | "maximumAmount"
  | "createdAt"
  | "updatedAt"
  | "universityName";

export type ScholarshipSortDirection = "asc" | "desc";

export type ScholarshipListFilters = {
  page?: number;
  pageSize?: number;
  sortBy?: ScholarshipSortBy;
  sortDirection?: ScholarshipSortDirection;
  universityId?: string;
  programId?: string;
  country?: string;
  publicationStatus?: UniversityPublicationStatus;
  scholarshipType?: string;
  minimumAward?: number;
  maximumAward?: number;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  currentlyOpen?: boolean;
  publishedOnly?: boolean;
  availability?: ScholarshipAvailabilityFilter;
  studyLevel?: string;
  scope?: ScholarshipScopeFilter;
  verificationStatus?: UniversityVerificationStatus;
};

export type ScholarshipSearchFilters = ScholarshipListFilters & {
  query: string;
};

export type ScholarshipManagementFilters = {
  query?: string;
  availability?: ScholarshipAvailabilityFilter;
  scholarshipType?: string;
  studyLevel?: string;
  scope?: ScholarshipScopeFilter;
  publicationStatus?: UniversityPublicationStatus;
  verificationStatus?: UniversityVerificationStatus;
};
