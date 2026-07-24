import type { ScholarshipAvailability } from "@prisma/client";

export const universityImportSources = ["university-study", "studies-overseas"] as const;
export type UniversityImportSourceName = (typeof universityImportSources)[number];

export type RawScholarship = {
  name?: string | null;
  availabilityEvidence?: string | null;
  explicitlyUnavailable?: boolean;
  amountText?: string | null;
  eligibilityText?: string | null;
  minimumGpa?: string | number | null;
  isAutomatic?: boolean | null;
  requiresSeparateApplication?: boolean | null;
  isRenewable?: boolean | null;
  renewalCriteria?: string | null;
  deadlineText?: string | null;
  scholarshipUrl?: string | null;
};

export type RawExtractedUniversity = {
  sourceExternalId?: string | null;
  sourceUniversityUrl: string;
  name?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  institutionType?: string | null;
  foundedYear?: string | number | null;
  description?: string | null;
  officialWebsiteUrl?: string | null;
  logoUrl?: string | null;
  bannerImageUrl?: string | null;
  aliases?: string[];
  programs?: Array<{
    name?: string | null;
    degreeLevel?: string | null;
    subjectArea?: string | null;
    durationText?: string | null;
    creditsText?: string | null;
    isStem?: boolean | null;
    programUrl?: string | null;
  }>;
  admissionRequirements?: Array<Record<string, unknown>>;
  tuition?: Array<Record<string, unknown>>;
  scholarships?: RawScholarship[];
  intakes?: Array<Record<string, unknown>>;
  links?: Array<{ type?: string | null; label?: string | null; url?: string | null }>;
};

export type NormalizedScholarship = {
  name: string | null;
  scholarshipAvailable: ScholarshipAvailability;
  amountText: string | null;
  minimumAmount: number | null;
  maximumAmount: number | null;
  currency: string | null;
  scholarshipType: string | null;
  eligibilityText: string | null;
  minimumGpa: number | null;
  isAutomatic: boolean | null;
  requiresSeparateApplication: boolean | null;
  isRenewable: boolean | null;
  renewalCriteria: string | null;
  deadlineText: string | null;
  scholarshipUrl: string | null;
  sourceUrl: string;
};

export type NormalizedUniversityRecord = {
  sourceName: UniversityImportSourceName;
  sourceUniversityUrl: string;
  sourceExternalId: string | null;
  name: string;
  slug: string;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  institutionType: string | null;
  foundedYear: number | null;
  description: string | null;
  officialWebsiteUrl: string | null;
  officialDomain: string | null;
  logoUrl: string | null;
  bannerImageUrl: string | null;
  aliases: string[];
  programs: Array<{
    name: string;
    slug: string;
    degreeLevel: string | null;
    subjectArea: string | null;
    durationText: string | null;
    creditsText: string | null;
    isStem: boolean | null;
    programUrl: string | null;
    sourceUrl: string;
  }>;
  admissionRequirements: Array<Record<string, unknown>>;
  tuition: Array<Record<string, unknown>>;
  scholarships: NormalizedScholarship[];
  intakes: Array<Record<string, unknown>>;
  links: Array<{ type: string; label: string | null; url: string; sourceUrl: string }>;
};

export type UniversityValidationResult = {
  valid: boolean;
  errors: string[];
  missingFields: string[];
};

export interface UniversitySourceAdapter {
  readonly sourceName: UniversityImportSourceName;
  discoverUniversityUrls(options?: {
    limit?: number;
    country?: string | null;
    maxAttempts?: number;
  }): Promise<string[]>;
  extractUniversity(sourceUrl: string): Promise<RawExtractedUniversity>;
  normalizeUniversity(raw: RawExtractedUniversity): NormalizedUniversityRecord;
  validateUniversity(normalized: NormalizedUniversityRecord): UniversityValidationResult;
}
