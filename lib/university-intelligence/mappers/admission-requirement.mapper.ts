import type { Prisma } from "@prisma/client";
import type { AdmissionRequirementManagementSummary } from "../dto/admission-requirement.dto";

export const admissionRequirementManagementSelect = {
  id: true,
  programId: true,
  studyLevel: true,
  minimumGpa: true,
  ieltsOverall: true,
  toeflOverall: true,
  pteOverall: true,
  duolingoOverall: true,
  statementOfPurposeRequired: true,
  recommendationLetters: true,
  requiredDocuments: true,
  verificationStatus: true,
  updatedAt: true,
  university: { select: { publicationStatus: true } },
  program: { select: { name: true, degreeLevel: true, publicationStatus: true } },
} satisfies Prisma.AdmissionRequirementSelect;

type Payload = Prisma.AdmissionRequirementGetPayload<{ select: typeof admissionRequirementManagementSelect }>;

function decimal(value: Prisma.Decimal | null) {
  return value === null ? null : value.toNumber();
}

function requiredDocument(value: Prisma.JsonValue | null, terms: string[]): boolean | null {
  const documents = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return documents.some((document) => terms.some((term) => document.toLowerCase().includes(term))) ? true : null;
}

export function mapAdmissionRequirementToManagementSummary(requirement: Payload): AdmissionRequirementManagementSummary {
  return {
    id: requirement.id,
    programId: requirement.programId,
    programName: requirement.program?.name ?? null,
    scope: requirement.programId ? "program-specific" : "university-wide",
    studyLevel: requirement.studyLevel,
    degreeLevel: requirement.program?.degreeLevel ?? null,
    ieltsOverall: decimal(requirement.ieltsOverall),
    toeflOverall: decimal(requirement.toeflOverall),
    pteOverall: decimal(requirement.pteOverall),
    duolingoOverall: decimal(requirement.duolingoOverall),
    minimumGpa: decimal(requirement.minimumGpa),
    moiAccepted: null,
    backlogsAccepted: null,
    statementOfPurposeRequired: requirement.statementOfPurposeRequired,
    recommendationLetters: requirement.recommendationLetters,
    resumeRequired: requiredDocument(requirement.requiredDocuments, ["resume", "curriculum vitae", "cv"]),
    passportRequired: requiredDocument(requirement.requiredDocuments, ["passport"]),
    interviewRequired: null,
    publicationStatus: requirement.program?.publicationStatus ?? requirement.university.publicationStatus,
    verificationStatus: requirement.verificationStatus,
    updatedAt: requirement.updatedAt,
  };
}
