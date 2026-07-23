export type UniversityCountryCode = "US" | "CA" | "GB" | "KR";

export type UniversityStudyLevel =
  | "foundation"
  | "associate"
  | "bachelor"
  | "postgraduate-certificate"
  | "master"
  | "doctorate";

export type EnglishTest = "IELTS" | "TOEFL" | "PTE" | "DUOLINGO" | "OTHER";

export type CurrencyCode = "USD" | "CAD" | "GBP" | "KRW";

export type UniversityCost = {
  currency: CurrencyCode;
  minimum: number | null;
  maximum: number | null;
  period: "year" | "program" | "application";
  note: string;
};

export type UniversityEnglishRequirement = {
  test: EnglishTest;
  minimumOverallScore: number | null;
  minimumComponentScore: number | null;
  note: string;
};

export type UniversityScholarship = {
  available: boolean;
  names: readonly string[];
  maximumAmount: UniversityCost | null;
  note: string;
};

export type UniversityIntake = {
  label: string;
  months: readonly number[];
  note: string;
};

export type University = {
  id: string;
  slug: string;
  name: string;
  country: UniversityCountryCode;
  city: string;
  logo: string | null;
  website: string;
  studyLevels: readonly UniversityStudyLevel[];
  majors: readonly string[];
  minimumGpa: number | null;
  gpaScale: number | null;
  englishRequirements: readonly UniversityEnglishRequirement[];
  tuition: UniversityCost;
  livingCost: UniversityCost;
  applicationFee: UniversityCost;
  scholarship: UniversityScholarship;
  intakePeriods: readonly UniversityIntake[];
  stemProgramsAvailable?: boolean;
  featured: boolean;
  active: boolean;
  sample: boolean;
};
