import type {
  UniversityPublicationStatus,
  UniversityVerificationStatus,
} from "../types/university";

export type ProgramUniversitySummary = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  state: string | null;
  city: string | null;
  logoUrl: string | null;
};

export type ProgramSummary = {
  id: string;
  universityId: string;
  name: string;
  slug: string;
  degreeLevel: string | null;
  studyLevel: string | null;
  programType: string | null;
  subjectArea: string | null;
  campus: string | null;
  durationText: string | null;
  isStem: boolean | null;
  active: boolean;
  publicationStatus: UniversityPublicationStatus;
  verificationStatus: UniversityVerificationStatus;
  university: ProgramUniversitySummary;
};

export type ProgramCard = ProgramSummary & {
  startingTuition: number | null;
  tuitionCurrency: string | null;
  scholarshipAvailable: boolean;
  intakeTerms: string[];
};

export type ProgramTuition = {
  id: string;
  amount: number | null;
  currency: string | null;
  period: string | null;
  academicYear: string | null;
  estimatedCoa: number | null;
  sourceUrl: string;
};

export type ProgramScholarship = {
  id: string;
  name: string | null;
  availability: "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";
  amountText: string | null;
  currency: string | null;
  deadlineText: string | null;
  sourceUrl: string;
};

export type ProgramIntake = {
  id: string;
  term: string;
  month: number | null;
  year: number | null;
  deadline: Date | null;
  sourceUrl: string;
};

export type ProgramDetail = ProgramCard & {
  award: string | null;
  department: string | null;
  deliveryMode: string | null;
  creditsText: string | null;
  lastVerifiedAt: Date | null;
  programUrl: string | null;
  sourceName: string;
  sourceUrl: string;
  tuition: ProgramTuition[];
  scholarships: ProgramScholarship[];
  intakes: ProgramIntake[];
  createdAt: Date;
  updatedAt: Date;
};

export type ProgramSearchResult = ProgramCard & {
  matchedQuery: string;
};
