import type { EnrichmentClaim } from "./types";
import {
  isUniversitySingletonClaim,
  universitySingletonFieldKey,
} from "./claim-precedence";

export function normalizedClaimValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim().toLowerCase().replace(/\s+/g, " ") || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, Object.keys(value as object).sort()).toLowerCase();
}

export function claimScopeKey(claim: EnrichmentClaim): string {
  if (isUniversitySingletonClaim(claim)) {
    return [
      claim.entityType,
      claim.entityKey,
      "",
      universitySingletonFieldKey(claim.fieldName),
      "",
      "",
      "",
    ].join("|");
  }
  return [
    claim.entityType,
    claim.entityKey,
    claim.programKey ?? "",
    claim.fieldName,
    claim.studyLevel ?? "",
    claim.entryRoute ?? "",
    claim.academicYear ?? "",
  ].join("|");
}

export function claimsConflict(left: EnrichmentClaim, right: EnrichmentClaim): boolean {
  if (claimScopeKey(left) !== claimScopeKey(right)) return false;
  return normalizedClaimValue(left.value) !== normalizedClaimValue(right.value);
}

export function scopeDescription(claim: EnrichmentClaim): string {
  return [
    claim.programKey ? `program ${claim.programKey}` : "university-wide",
    claim.studyLevel,
    claim.entryRoute,
    claim.academicYear,
  ].filter(Boolean).join(" · ");
}
