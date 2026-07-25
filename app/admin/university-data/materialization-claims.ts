import type { FieldAuthorityLevel, Prisma } from "@prisma/client";
import {
  isUniversitySingletonClaim,
  selectPreferredClaim,
  universitySingletonFieldKey,
} from "@/src/lib/university-import/enrichment/claim-precedence";

export type MaterializationClaim = {
  id?: string;
  programId: string | null;
  entityType: string;
  fieldName: string;
  valueJson: Prisma.JsonValue;
  sourceName: string;
  sourceUrl: string;
  authorityLevel?: FieldAuthorityLevel;
  confidence?: number;
  observedAt?: Date;
  studyLevel: string | null;
  entryRoute: string | null;
  academicYear: string | null;
  isPreferred: boolean;
};

function fallbackAuthority(sourceName: string): FieldAuthorityLevel {
  return sourceName === "manual-review" ? "MANUAL_VERIFIED"
    : sourceName === "official-university" ? "OFFICIAL_UNIVERSITY"
      : sourceName === "university-study" ? "UNIVERSITY_STUDY"
        : "STUDIES_OVERSEAS";
}

export function selectClaimsForMaterialization(
  claims: readonly MaterializationClaim[],
): MaterializationClaim[] {
  const singleton = claims.filter(isUniversitySingletonClaim);
  const singletonGroups = Map.groupBy(singleton, (claim) =>
    universitySingletonFieldKey(claim.fieldName)
  );
  const winners = [...singletonGroups.values()].map((group) =>
    selectPreferredClaim(group.map((claim) => ({
      ...claim,
      value: claim.valueJson,
      authorityLevel: claim.authorityLevel ?? fallbackAuthority(claim.sourceName),
      confidence: claim.confidence ?? 0,
      observedAt: claim.observedAt ?? new Date(0),
    })))
  );
  return [
    ...winners,
    ...claims.filter((claim) => !isUniversitySingletonClaim(claim) && claim.isPreferred),
  ];
}
