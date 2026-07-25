import type { FieldAuthorityLevel, FieldConflictStatus } from "@prisma/client";
import type { VerificationStatus } from "@prisma/client";
import { selectPreferredClaim } from "./claim-precedence";
import { claimScopeKey, claimsConflict, scopeDescription } from "./field-comparison";
import type { EnrichmentClaim, ResolvedClaimGroup } from "./types";

export const defaultClaimConfidence: Record<FieldAuthorityLevel, number> = {
  MANUAL_VERIFIED: 100,
  OFFICIAL_UNIVERSITY: 95,
  PATHWAY_PROVIDER: 88,
  UNIVERSITY_STUDY: 78,
  STUDIES_OVERSEAS: 70,
};

export function validateConfidence(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error("Claim confidence must be from 0 to 100.");
  return Math.round(value);
}

function preferredClaim(claims: readonly EnrichmentClaim[]): EnrichmentClaim {
  return selectPreferredClaim(claims);
}

export function resolveSourceClaims(claims: readonly EnrichmentClaim[]): ResolvedClaimGroup[] {
  const grouped = new Map<string, EnrichmentClaim[]>();
  for (const claim of claims) {
    const key = claimScopeKey(claim);
    grouped.set(key, [...(grouped.get(key) ?? []), { ...claim, confidence: validateConfidence(claim.confidence) }]);
  }
  return [...grouped.entries()].map(([key, group]) => {
    const preferred = preferredClaim(group);
    const competing = group.filter((claim) => claim !== preferred);
    const conflict = competing.some((claim) => claimsConflict(preferred, claim));
    const manuallyLocked = preferred.authorityLevel === "MANUAL_VERIFIED";
    const conflictStatus: FieldConflictStatus = manuallyLocked && conflict
      ? "MANUAL_LOCKED"
      : conflict
        ? "CONFLICT_REVIEW"
        : "NONE";
    return {
      key,
      fieldName: preferred.fieldName,
      scope: scopeDescription(preferred),
      preferred: { ...preferred, isPreferred: true, conflictStatus },
      competing: competing.map((claim) => ({ ...claim, isPreferred: false, conflictStatus })),
      conflictStatus,
      conflictReason: manuallyLocked && conflict
        ? "A manually verified value is locked."
        : conflict
          ? `${preferred.authorityLevel.replaceAll("_", " ")} has higher factual authority for the same scope.`
          : null,
    };
  });
}

export function preferredClaimForProgram(
  universityWide: readonly EnrichmentClaim[],
  programSpecific: readonly EnrichmentClaim[],
  fieldName: string,
): EnrichmentClaim | null {
  const programClaims = programSpecific.filter((claim) => claim.fieldName === fieldName);
  if (programClaims.length) return resolveSourceClaims(programClaims)[0]?.preferred ?? null;
  return resolveSourceClaims(universityWide.filter((claim) => claim.fieldName === fieldName))[0]?.preferred ?? null;
}

export function nextVerificationStatus(
  current: VerificationStatus,
  evidence: "partner-match" | "official-success" | "official-failure" | "manual",
): VerificationStatus {
  if (current === "MANUALLY_VERIFIED") return current;
  if (evidence === "manual") return "MANUALLY_VERIFIED";
  if (evidence === "official-success") return "OFFICIAL_VERIFIED";
  if (evidence === "official-failure") return "VERIFICATION_FAILED";
  return "PARTNER_MATCHED";
}
