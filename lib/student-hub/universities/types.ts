export type UniversityCountryCode = "US" | "CA" | "GB" | "KR";
export type CurrencyCode = "USD" | "CAD" | "GBP" | "KRW";
export type UniversityStudyLevel =
  | "foundation"
  | "associate"
  | "bachelor"
  | "postgraduate-certificate"
  | "master"
  | "doctorate";
export type EnglishTestType = "IELTS" | "TOEFL" | "PTE" | "DUOLINGO" | "OTHER";
export type VerificationStatus = "verified" | "partially-verified" | "unverified";
export type VerificationSourceType =
  | "official-university"
  | "official-government"
  | "partner"
  | "internal"
  | "sample";
export type SubjectCoverage = "verified-complete" | "partial" | "unknown";
export type TuitionPeriod =
  | "academic-year"
  | "semester"
  | "term"
  | "full-program"
  | "credit-hour"
  | "unknown";
export type ScholarshipState = "available" | "unavailable" | "unknown";
export type IntakeStatus = "open" | "closed" | "expected" | "unknown";
export type QualificationCompatibilityState =
  | "accepted"
  | "not-accepted"
  | "requires-review"
  | "unknown";
export type LocationClassification = "urban" | "suburban" | "regional" | "rural" | "unknown";

export type VerificationMetadata = {
  verificationStatus: VerificationStatus;
  sourceType: VerificationSourceType;
  lastReviewedAt: string | null;
  sourceUrl: string | null;
  notes: string | null;
};

export type AcademicRequirement = {
  gradingSystem: string;
  minimumScore: number;
  maximumScale: number;
  qualificationLevel: string | null;
  verification: VerificationMetadata;
};

export type EnglishComponentScores = Readonly<Partial<Record<"listening" | "reading" | "writing" | "speaking", number>>>;

export type ProgramEnglishRequirement = {
  testType: EnglishTestType;
  minimumOverallScore: number;
  componentScores: EnglishComponentScores | null;
  alternativeGroup: string | null;
  verification: VerificationMetadata;
};

export type ProgramTuition = {
  amount: number | null;
  minimumAmount: number | null;
  currency: CurrencyCode;
  period: TuitionPeriod;
  verification: VerificationMetadata;
};

export type ProgramIntake = {
  month: number | null;
  namedPeriod: string | null;
  year: number | null;
  status: IntakeStatus;
  verification: VerificationMetadata;
};

export type ProgramScholarship = {
  state: ScholarshipState;
  type: string | null;
  amount: number | null;
  currency: CurrencyCode | null;
  eligibilityNotes: string | null;
  sourceUrl: string | null;
  lastReviewedAt: string | null;
  verification: VerificationMetadata;
};

export type PreviousQualificationRequirement = {
  qualificationLevel: string;
  state: QualificationCompatibilityState;
  verification: VerificationMetadata;
};

export type UniversityProgram = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  subjectAliases: readonly string[];
  studyLevel: UniversityStudyLevel;
  previousQualificationRequirements: readonly PreviousQualificationRequirement[];
  academicRequirements: readonly AcademicRequirement[];
  englishRequirements: readonly ProgramEnglishRequirement[];
  tuition: ProgramTuition | null;
  intakes: readonly ProgramIntake[];
  scholarship: ProgramScholarship;
  locationClassification: LocationClassification;
  active: boolean;
  verification: VerificationMetadata;
};

export type University = {
  id: string;
  slug: string;
  name: string;
  country: UniversityCountryCode;
  city: string;
  website: string;
  logo: string | null;
  active: boolean;
  featured: boolean;
  sampleRecord: boolean;
  subjectCoverage: SubjectCoverage;
  verification: VerificationMetadata;
  programs: readonly UniversityProgram[];
};

/** @deprecated Use EnglishTestType. */
export type EnglishTest = EnglishTestType;
