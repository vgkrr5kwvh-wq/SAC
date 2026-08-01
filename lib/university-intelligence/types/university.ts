export type UniversityPublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type UniversityVerificationStatus =
  | "DISCOVERED"
  | "PARTNER_MATCHED"
  | "OFFICIAL_VERIFIED"
  | "MANUALLY_VERIFIED"
  | "VERIFICATION_FAILED";

export type UniversityListFilters = {
  country?: string;
  state?: string;
  city?: string;
  publicationStatus?: UniversityPublicationStatus;
  verificationStatus?: UniversityVerificationStatus;
  verifiedOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type UniversitySearchFilters = UniversityListFilters & {
  query: string;
};

export type UniversityManagementFilters = {
  query?: string;
  country?: string;
  publicationStatus?: UniversityPublicationStatus;
  verificationStatus?: UniversityVerificationStatus;
};
