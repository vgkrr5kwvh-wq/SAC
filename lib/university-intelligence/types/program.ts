export type ProgramSortBy =
  | "name"
  | "createdAt"
  | "updatedAt"
  | "degreeLevel"
  | "universityName";

export type SortDirection = "asc" | "desc";

export type ProgramListFilters = {
  page?: number;
  pageSize?: number;
  sortBy?: ProgramSortBy;
  sortDirection?: SortDirection;
  universityId?: string;
  country?: string;
  degreeLevel?: string;
  campus?: string;
  intake?: string;
  scholarshipAvailable?: boolean;
  tuitionMin?: number;
  tuitionMax?: number;
  publishedOnly?: boolean;
  publicationStatus?: import("./university").UniversityPublicationStatus;
};

export type ProgramSearchFilters = ProgramListFilters & {
  query: string;
};

export type ProgramIdentityOptions = {
  universityId?: string;
  publishedOnly?: boolean;
};

export type ProgramManagementFilters = {
  query?: string;
  degreeLevel?: string;
  campus?: string;
  intake?: string;
  publicationStatus?: import("./university").UniversityPublicationStatus;
};
