import type {
  UniversityPublicationStatus,
  UniversityVerificationStatus,
} from "../types/university";

export type UniversitySummary = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  state: string | null;
  city: string | null;
  institutionType: string | null;
  foundedYear: number | null;
  officialWebsiteUrl: string | null;
  logoUrl: string | null;
  publicationStatus: UniversityPublicationStatus;
  verificationStatus: UniversityVerificationStatus;
  programCount: number;
};

export type UniversityDetail = UniversitySummary & {
  address: string | null;
  description: string | null;
  bannerImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginationMetadata = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  pagination: PaginationMetadata;
};
