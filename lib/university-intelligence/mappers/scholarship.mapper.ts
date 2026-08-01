import type { Prisma } from "@prisma/client";

import type {
  ScholarshipCard,
  ScholarshipDetail,
  ScholarshipSearchResult,
  ScholarshipSummary,
  ScholarshipManagementSummary,
} from "../dto/scholarship.dto";

export const scholarshipSelect = {
  id: true,
  universityId: true,
  programId: true,
  name: true,
  scholarshipAvailable: true,
  amountText: true,
  minimumAmount: true,
  maximumAmount: true,
  currency: true,
  scholarshipType: true,
  studyLevel: true,
  entryRoute: true,
  eligibilityText: true,
  minimumGpa: true,
  isAutomatic: true,
  requiresSeparateApplication: true,
  isRenewable: true,
  renewalCriteria: true,
  deadlineText: true,
  scholarshipUrl: true,
  sourceUrl: true,
  publicationStatus: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
  university: {
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
    },
  },
  program: {
    select: {
      id: true,
      name: true,
      slug: true,
      degreeLevel: true,
    },
  },
} satisfies Prisma.ScholarshipSelect;

export type ScholarshipRepositoryPayload = Prisma.ScholarshipGetPayload<{
  select: typeof scholarshipSelect;
}>;

function decimalToNumber(
  value: Prisma.Decimal | null,
): number | null {
  return value === null ? null : value.toNumber();
}

export function parseScholarshipDeadline(
  deadlineText: string | null,
): Date | null {
  if (!deadlineText) return null;
  const value = deadlineText.trim();
  if (!value) return null;
  const supported = /^\d{4}-\d{2}-\d{2}$/.test(value)
    || /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/i.test(value);
  if (!supported) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function eligibilitySummary(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 240
    ? `${normalized.slice(0, 237).trimEnd()}...`
    : normalized;
}

export function mapScholarshipToSummary(
  scholarship: ScholarshipRepositoryPayload,
): ScholarshipSummary {
  return {
    id: scholarship.id,
    universityId: scholarship.universityId,
    programId: scholarship.programId,
    scope: scholarship.programId ? "program-specific" : "university-wide",
    name: scholarship.name,
    availability: scholarship.scholarshipAvailable,
    scholarshipType: scholarship.scholarshipType,
    studyLevel: scholarship.studyLevel,
    minimumAmount: decimalToNumber(scholarship.minimumAmount),
    maximumAmount: decimalToNumber(scholarship.maximumAmount),
    currency: scholarship.currency,
    deadlineText: scholarship.deadlineText,
    deadline: parseScholarshipDeadline(scholarship.deadlineText),
    publicationStatus: scholarship.publicationStatus,
    verificationStatus: scholarship.verificationStatus,
    university: scholarship.university,
    program: scholarship.program,
  };
}

export function mapScholarshipToCard(
  scholarship: ScholarshipRepositoryPayload,
): ScholarshipCard {
  return {
    ...mapScholarshipToSummary(scholarship),
    amountText: scholarship.amountText,
    eligibilitySummary: eligibilitySummary(scholarship.eligibilityText),
    scholarshipUrl: scholarship.scholarshipUrl,
  };
}

export function mapScholarshipToDetail(
  scholarship: ScholarshipRepositoryPayload,
): ScholarshipDetail {
  return {
    ...mapScholarshipToCard(scholarship),
    entryRoute: scholarship.entryRoute,
    minimumGpa: decimalToNumber(scholarship.minimumGpa),
    isAutomatic: scholarship.isAutomatic,
    requiresSeparateApplication: scholarship.requiresSeparateApplication,
    isRenewable: scholarship.isRenewable,
    renewalCriteria: scholarship.renewalCriteria,
    eligibilityText: scholarship.eligibilityText,
    sourceUrl: scholarship.sourceUrl,
    createdAt: scholarship.createdAt,
    updatedAt: scholarship.updatedAt,
  };
}

export function mapScholarshipToSearchResult(
  scholarship: ScholarshipRepositoryPayload,
  matchedQuery: string,
): ScholarshipSearchResult {
  return {
    ...mapScholarshipToCard(scholarship),
    matchedQuery,
  };
}

export function mapScholarshipToManagementSummary(
  scholarship: ScholarshipRepositoryPayload,
): ScholarshipManagementSummary {
  const card = mapScholarshipToCard(scholarship);
  return {
    id: card.id,
    name: card.name,
    programId: card.programId,
    programName: card.program?.name ?? null,
    scope: card.scope,
    availability: card.availability,
    amountText: card.amountText,
    minimumAmount: card.minimumAmount,
    maximumAmount: card.maximumAmount,
    currency: card.currency,
    scholarshipType: card.scholarshipType,
    studyLevel: card.studyLevel,
    deadlineText: card.deadlineText,
    publicationStatus: card.publicationStatus,
    verificationStatus: card.verificationStatus,
    updatedAt: scholarship.updatedAt,
  };
}
