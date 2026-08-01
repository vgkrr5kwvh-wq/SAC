import type {
  UniversityPublicationStatus,
  UniversityVerificationStatus,
} from "../types/university";

export type ScholarshipUniversitySummary = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
};

export type ScholarshipProgramSummary = {
  id: string;
  name: string;
  slug: string;
  degreeLevel: string | null;
};

export type ScholarshipSummary = {
  id: string;
  universityId: string;
  programId: string | null;
  scope: "university-wide" | "program-specific";
  name: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  scholarshipType: string | null;
  studyLevel: string | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  currency: string | null;
  deadlineText: string | null;
  deadline: Date | null;
  publicationStatus: UniversityPublicationStatus;
  verificationStatus: UniversityVerificationStatus;
  university: ScholarshipUniversitySummary;
  program: ScholarshipProgramSummary | null;
};

export type ScholarshipCard = ScholarshipSummary & {
  amountText: string | null;
  eligibilitySummary: string | null;
  scholarshipUrl: string | null;
};

export type ScholarshipDetail = ScholarshipCard & {
  entryRoute: string | null;
  minimumGpa: number | null;
  isAutomatic: boolean | null;
  requiresSeparateApplication: boolean | null;
  isRenewable: boolean | null;
  renewalCriteria: string | null;
  eligibilityText: string | null;
  sourceUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ScholarshipSearchResult = ScholarshipCard & {
  matchedQuery: string;
};

export type ScholarshipManagementSummary = {
  id: string;
  name: string | null;
  programId: string | null;
  programName: string | null;
  scope: "university-wide" | "program-specific";
  availability: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  amountText: string | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  currency: string | null;
  scholarshipType: string | null;
  studyLevel: string | null;
  deadlineText: string | null;
  publicationStatus: UniversityPublicationStatus;
  verificationStatus: UniversityVerificationStatus;
  updatedAt: Date;
};

export type ScholarshipManagementResult = {
  scholarships: ScholarshipManagementSummary[];
  statistics: {
    total: number;
    published: number;
    draft: number;
    available: number;
    unavailable: number;
    unknown: number;
    universityWide: number;
    programSpecific: number;
  };
  options: {
    scholarshipTypes: string[];
    studyLevels: string[];
  };
};
