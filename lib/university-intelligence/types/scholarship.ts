import type {
  UniversityPublicationStatus,
} from "./university";

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
};

export type ScholarshipSearchFilters = ScholarshipListFilters & {
  query: string;
};
