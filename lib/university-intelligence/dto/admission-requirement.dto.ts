import type { AdmissionRequirementScope } from "../types/admission-requirement";
import type { UniversityPublicationStatus, UniversityVerificationStatus } from "../types/university";

export type AdmissionRequirementManagementSummary = {
  id: string;
  programId: string | null;
  programName: string | null;
  scope: AdmissionRequirementScope;
  studyLevel: string | null;
  degreeLevel: string | null;
  ieltsOverall: number | null;
  toeflOverall: number | null;
  pteOverall: number | null;
  duolingoOverall: number | null;
  minimumGpa: number | null;
  moiAccepted: boolean | null;
  backlogsAccepted: boolean | null;
  statementOfPurposeRequired: boolean | null;
  recommendationLetters: number | null;
  resumeRequired: boolean | null;
  passportRequired: boolean | null;
  interviewRequired: boolean | null;
  publicationStatus: UniversityPublicationStatus;
  verificationStatus: UniversityVerificationStatus;
  updatedAt: Date;
};

export type AdmissionRequirementManagementResult = {
  requirements: AdmissionRequirementManagementSummary[];
  statistics: {
    total: number;
    published: number;
    draft: number;
    officiallyVerified: number;
    universityWide: number;
    programSpecific: number;
  };
  options: {
    studyLevels: string[];
    degreeLevels: string[];
    programs: Array<{ id: string; name: string }>;
  };
};
