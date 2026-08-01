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

export type UniversityManagementSummary = UniversitySummary & {
  totalProgramCount: number;
  updatedAt: Date;
};

export type UniversityManagementStatistics = {
  total: number;
  published: number;
  draft: number;
  pendingReview: number;
  officiallyVerified: number;
};

export type UniversityManagementIdentity = {
  id: string;
  name: string;
};

export type UniversityManagementResult = {
  universities: UniversityManagementSummary[];
  statistics: UniversityManagementStatistics;
  countries: string[];
};

export type UniversityManagementSource = {
  id: string;
  name: string;
  url: string;
  isPrimary: boolean;
  lastCheckedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
};

export type UniversityManagementImportActivity = {
  recordStatus: string;
  recordCreatedAt: Date;
  jobStatus: string;
  jobCreatedAt: Date;
  sourceName: string;
};

export type UniversityManagementReviewActivity = {
  status: string;
  reviewedAt: Date;
  reviewer: string;
};

export type UniversityManagementOverviewBase = {
  university: UniversityDetail;
  sources: UniversityManagementSource[];
  pendingReviewItems: number;
  latestImport: UniversityManagementImportActivity | null;
  latestReview: UniversityManagementReviewActivity | null;
  tabCounts: {
    admissionRequirements: number;
    tuitionRecords: number;
    intakes: number;
    claims: number;
    sources: number;
    history: number;
  };
};

export type UniversityManagementOverview = UniversityManagementOverviewBase & {
  statistics: {
    totalPrograms: number;
    publishedPrograms: number;
    totalScholarships: number;
    pendingReviewItems: number;
  };
};

export type UniversityDetail = UniversitySummary & {
  address: string | null;
  description: string | null;
  bannerImageUrl: string | null;
  links: UniversityPublicLink[];
  admissionRequirements: UniversityAdmissionRequirement[];
  createdAt: Date;
  updatedAt: Date;
};

export type UniversityPublicLink = {
  id: string;
  type: string;
  label: string | null;
  url: string;
};

export type UniversityAdmissionRequirement = {
  id: string;
  programId: string | null;
  program: {
    name: string;
    slug: string;
  } | null;
  studyLevel: string | null;
  entryRoute: string | null;
  minimumGpa: number | null;
  academicRequirementText: string | null;
  ieltsOverall: number | null;
  toeflOverall: number | null;
  pteOverall: number | null;
  duolingoOverall: number | null;
  greRequired: boolean | null;
  gmatRequired: boolean | null;
  satRequired: boolean | null;
  actRequired: boolean | null;
  applicationFee: number | null;
  currency: string | null;
  requirementUrl: string | null;
  applicationUrl: string | null;
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
