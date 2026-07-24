import type { University, VerificationMetadata } from "./types";
import type { CatalogIngestionIssue } from "./errors";

export type VerificationFreshnessPolicy = {
  verifiedMaxAgeDays: number;
  partiallyVerifiedMaxAgeDays: number;
};

export const defaultVerificationFreshnessPolicy: VerificationFreshnessPolicy = {
  verifiedMaxAgeDays: 365,
  partiallyVerifiedMaxAgeDays: 180,
};

export type VerificationFreshness =
  | { status: "current"; ageDays: number; maxAgeDays: number }
  | { status: "stale"; ageDays: number | null; maxAgeDays: number; reason: "expired" | "missing-review-date" }
  | { status: "unverified"; ageDays: null; maxAgeDays: null };

function startOfUtcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function getVerificationFreshness(
  verification: VerificationMetadata,
  referenceDate: Date,
  policy: VerificationFreshnessPolicy = defaultVerificationFreshnessPolicy,
): VerificationFreshness {
  if (verification.verificationStatus === "unverified" || verification.sourceType === "sample") {
    return { status: "unverified", ageDays: null, maxAgeDays: null };
  }
  const maxAgeDays = verification.verificationStatus === "verified"
    ? policy.verifiedMaxAgeDays
    : policy.partiallyVerifiedMaxAgeDays;
  if (!verification.lastReviewedAt) {
    return { status: "stale", ageDays: null, maxAgeDays, reason: "missing-review-date" };
  }
  const reviewed = new Date(`${verification.lastReviewedAt}T00:00:00Z`);
  const ageDays = Math.max(0, Math.floor((startOfUtcDay(referenceDate) - startOfUtcDay(reviewed)) / 86_400_000));
  return ageDays > maxAgeDays
    ? { status: "stale", ageDays, maxAgeDays, reason: "expired" }
    : { status: "current", ageDays, maxAgeDays };
}

export function isVerificationStale(
  verification: VerificationMetadata,
  referenceDate: Date,
  policy: VerificationFreshnessPolicy = defaultVerificationFreshnessPolicy,
): boolean {
  return getVerificationFreshness(verification, referenceDate, policy).status === "stale";
}

export type CatalogFreshnessAssessment = {
  verifiedRecordCount: number;
  staleRecordCount: number;
  unverifiedRecordCount: number;
  warnings: readonly CatalogIngestionIssue[];
};

export function assessCatalogFreshness(
  catalog: readonly University[],
  referenceDate: Date,
  policy: VerificationFreshnessPolicy = defaultVerificationFreshnessPolicy,
): CatalogFreshnessAssessment {
  let verifiedRecordCount = 0;
  let staleRecordCount = 0;
  let unverifiedRecordCount = 0;
  const warnings: CatalogIngestionIssue[] = [];

  catalog.forEach((university, universityIndex) => {
    const records = [
      {
        verification: university.verification,
        path: [universityIndex, "verification"] as const,
        universitySlug: university.slug,
        programSlug: undefined,
      },
      ...university.programs.map((program, programIndex) => ({
        verification: program.verification,
        path: [universityIndex, "programs", programIndex, "verification"] as const,
        universitySlug: university.slug,
        programSlug: program.slug,
      })),
    ];
    records.forEach((record) => {
      const freshness = getVerificationFreshness(record.verification, referenceDate, policy);
      if (freshness.status === "current") verifiedRecordCount += 1;
      if (freshness.status === "unverified") unverifiedRecordCount += 1;
      if (freshness.status === "stale") {
        staleRecordCount += 1;
        warnings.push({
          code: freshness.reason === "missing-review-date" ? "invalid-verification-metadata" : "stale-verification",
          severity: "warning",
          path: record.path,
          message: freshness.reason === "missing-review-date"
            ? "Verified or partially verified record is missing lastReviewedAt."
            : `Verification is ${freshness.ageDays} days old and exceeds the ${freshness.maxAgeDays}-day review interval.`,
          universitySlug: record.universitySlug,
          ...(record.programSlug ? { programSlug: record.programSlug } : {}),
          suggestedRemediation: "Review the source and update lastReviewedAt without deleting the record.",
        });
      }
    });
  });

  return { verifiedRecordCount, staleRecordCount, unverifiedRecordCount, warnings };
}
