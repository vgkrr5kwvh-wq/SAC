import type {
  University,
  UniversityProgram,
  VerificationMetadata,
} from "../../lib/student-hub/universities";
import type { UniversityFinderInput } from "../../lib/student-hub/university-finder/schema";

export const verifiedMetadata: VerificationMetadata = {
  verificationStatus: "verified",
  sourceType: "official-university",
  lastReviewedAt: "2026-07-01",
  sourceUrl: "https://example.edu/requirements",
  notes: null,
};

export const questionnaire: UniversityFinderInput = {
  destination: "CA",
  studyLevel: "master",
  subject: "computer-science",
  preferredIntake: "september-december",
  previousQualification: "bachelor-degree",
  gradingSystem: "gpa-4",
  academicScore: "3.5",
  customGpaScale: "",
  englishTest: "IELTS",
  englishScore: "7.5",
  otherEnglishTest: "",
  annualTuitionBudget: "25000",
  locationType: "major-city",
  scholarshipPreference: "preferred",
};

export const program: UniversityProgram = {
  id: "program-001",
  slug: "master-computer-science",
  name: "Master of Computer Science",
  subject: "computer-science",
  subjectAliases: ["computing"],
  studyLevel: "master",
  previousQualificationRequirements: [{
    qualificationLevel: "bachelor-degree",
    state: "accepted",
    verification: verifiedMetadata,
  }],
  academicRequirements: [{
    gradingSystem: "gpa-4",
    minimumScore: 3.5,
    maximumScale: 4,
    qualificationLevel: "bachelor-degree",
    verification: verifiedMetadata,
  }],
  englishRequirements: [{
    testType: "IELTS",
    minimumOverallScore: 7.5,
    componentScores: null,
    alternativeGroup: null,
    verification: verifiedMetadata,
  }],
  tuition: {
    amount: null,
    minimumAmount: 25000,
    currency: "CAD",
    period: "academic-year",
    verification: verifiedMetadata,
  },
  intakes: [{
    month: 9,
    namedPeriod: "Fall",
    year: 2027,
    status: "open",
    verification: verifiedMetadata,
  }],
  scholarship: {
    state: "available",
    type: "Entrance award",
    amount: null,
    currency: null,
    eligibilityNotes: null,
    sourceUrl: "https://example.edu/scholarships",
    lastReviewedAt: "2026-07-01",
    verification: verifiedMetadata,
  },
  locationClassification: "urban",
  active: true,
  verification: verifiedMetadata,
};

export const university: University = {
  id: "university-001",
  slug: "production-university",
  name: "Production University",
  country: "CA",
  city: "Test City",
  logo: null,
  website: "https://example.edu",
  active: true,
  featured: true,
  sampleRecord: false,
  subjectCoverage: "verified-complete",
  verification: verifiedMetadata,
  programs: [program],
};

export function withProgram(overrides: Partial<UniversityProgram>): UniversityProgram {
  return { ...program, ...overrides };
}

export function withUniversity(overrides: Partial<University>): University {
  return { ...university, ...overrides };
}
