import type {
  FieldAuthorityLevel,
  FieldConflictStatus,
  VerificationStatus,
} from "@prisma/client";

export type ClaimEntityType =
  | "university"
  | "program"
  | "admission-requirement"
  | "tuition"
  | "scholarship"
  | "intake"
  | "university-link";

export type EnrichmentClaim = {
  entityType: ClaimEntityType;
  entityKey: string;
  programKey: string | null;
  fieldName: string;
  value: unknown;
  normalizedValue: string | null;
  sourceName: string;
  sourceUrl: string;
  authorityLevel: FieldAuthorityLevel;
  confidence: number;
  observedAt: Date;
  rawEvidenceText: string | null;
  scopeLabel: string | null;
  studyLevel: string | null;
  entryRoute: string | null;
  academicYear: string | null;
  isPreferred?: boolean;
  conflictStatus?: FieldConflictStatus;
};

export type ResolvedClaimGroup = {
  key: string;
  fieldName: string;
  scope: string;
  preferred: EnrichmentClaim;
  competing: EnrichmentClaim[];
  conflictStatus: FieldConflictStatus;
  conflictReason: string | null;
};

export type OfficialPageKind =
  | "homepage"
  | "international-admissions"
  | "undergraduate-admissions"
  | "graduate-admissions"
  | "tuition"
  | "scholarships"
  | "english-proficiency"
  | "application-requirements"
  | "program-directory-undergraduate"
  | "program-directory-graduate"
  | "program"
  | "pathway";

export type OfficialPageCandidate = {
  url: string;
  label: string;
  kind: OfficialPageKind;
};

export type OfficialPageSnapshot = OfficialPageCandidate & {
  finalUrl: string;
  status: number;
  html: string | null;
  accessIssue: string | null;
  checkedAt: Date;
};

export type EnrichedProgram = {
  key: string;
  name: string;
  slug: string;
  studyLevel: string;
  degreeLevel: string | null;
  award: string | null;
  programType: string;
  department: string | null;
  officialProgramUrl: string;
  deliveryMode: string | null;
  campus: string | null;
  durationText: string | null;
  creditsText: string | null;
  isStem: boolean | null;
  active: boolean;
  lastVerifiedAt: Date;
  verificationStatus: VerificationStatus;
  claims: EnrichmentClaim[];
};

export type PartnerSourceMatch = {
  status: "MATCHED" | "NOT_FOUND" | "MANUAL_REVIEW";
  profileUrl: string | null;
  reason: string;
  rawPayload: unknown;
  normalizedPayload: unknown;
  claims: EnrichmentClaim[];
};

export type EnrichmentResult = {
  universityId: string;
  universityName: string;
  verifiedOfficialDomain: string;
  studiesOverseas: PartnerSourceMatch;
  officialPages: OfficialPageSnapshot[];
  programDirectoryPages: OfficialPageSnapshot[];
  programs: EnrichedProgram[];
  claims: EnrichmentClaim[];
  resolvedClaims: ResolvedClaimGroup[];
  missingFields: string[];
  verificationStatus: VerificationStatus;
  diagnostics: EnrichmentDiagnostics;
};

export type ProgramDirectoryDiagnostics = {
  requestedUrl: string;
  finalUrl: string;
  pageKind: OfficialPageKind;
  status: number;
  accessIssue: string | null;
  candidateLinksBeforeFiltering: number;
  acceptedLinksAfterFiltering: number;
  acceptedByStudyLevel: Record<string, number>;
  acceptedCandidates: Array<{
    name: string;
    url: string;
    studyLevel: string;
    programType: string;
  }>;
  rejectedCandidates: Array<{
    name: string;
    url: string;
    reason: string;
  }>;
  rejectionCounts: Record<string, number>;
};

export type EnrichmentDiagnostics = {
  pages: Array<{
    requestedUrl: string;
    finalUrl: string;
    status: number;
    pageKind: OfficialPageKind;
    accessIssue: string | null;
  }>;
  programDirectories: ProgramDirectoryDiagnostics[];
  selectedProgramPages: Array<{
    name: string;
    url: string;
    studyLevel: string;
    programType: string;
  }>;
  attemptedProgramPages: Array<{
    name: string;
    studyLevel: string;
    requestedUrl: string;
    finalUrl: string;
    status: number;
    accessIssue: string | null;
    finalPageHeading: string | null;
    qualified: boolean;
    qualificationReason: string;
  }>;
  claimsBySourceEntityField: Record<string, number>;
  conflicts: Array<{
    fieldName: string;
    scope: string;
    reason: string | null;
  }>;
};

export type EnrichmentTarget = {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  state: string | null;
  city: string | null;
  officialWebsiteUrl: string;
  verificationStatus: VerificationStatus;
  aliases: string[];
  universityStudyUrl: string | null;
};
