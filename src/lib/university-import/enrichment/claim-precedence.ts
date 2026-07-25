import type { FieldAuthorityLevel } from "@prisma/client";

export const universitySingletonFields = new Set([
  "officialWebsiteUrl",
  "officialName",
  "name",
  "city",
  "state",
  "country",
  "address",
  "institutionType",
  "foundedYear",
  "description",
  "logoUrl",
  "bannerImageUrl",
]);

export type ComparableClaim = {
  id?: string;
  entityType: string;
  fieldName: string;
  value: unknown;
  sourceName: string;
  sourceUrl: string;
  authorityLevel: FieldAuthorityLevel;
  confidence: number;
  observedAt: Date;
};

const authorityRank: Record<FieldAuthorityLevel, number> = {
  MANUAL_VERIFIED: 500,
  OFFICIAL_UNIVERSITY: 400,
  PATHWAY_PROVIDER: 350,
  UNIVERSITY_STUDY: 200,
  STUDIES_OVERSEAS: 100,
};

export function isUniversitySingletonClaim(
  claim: Pick<ComparableClaim, "entityType" | "fieldName">,
): boolean {
  return claim.entityType === "university" && universitySingletonFields.has(claim.fieldName);
}

export function universitySingletonFieldKey(fieldName: string): string {
  return fieldName === "officialName" ? "name" : fieldName;
}

function protocolRank(value: unknown): number {
  if (typeof value !== "string") return 0;
  try {
    return new URL(value).protocol === "https:" ? 1 : 0;
  } catch {
    return 0;
  }
}

function normalizedHostname(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function verifiedSameDomainRank(claim: ComparableClaim): number {
  if (claim.fieldName !== "officialWebsiteUrl" || typeof claim.value !== "string") return 0;
  const valueHost = normalizedHostname(claim.value);
  const sourceHost = normalizedHostname(claim.sourceUrl);
  return valueHost && sourceHost
    && (valueHost === sourceHost || valueHost.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${valueHost}`))
    ? 1
    : 0;
}

function stableKey(claim: ComparableClaim): string {
  return claim.id ?? [
    claim.entityType,
    claim.fieldName,
    claim.sourceName,
    claim.sourceUrl,
    JSON.stringify(claim.value),
  ].join("|");
}

export function compareClaimsByPrecedence(left: ComparableClaim, right: ComparableClaim): number {
  const authority = authorityRank[right.authorityLevel] - authorityRank[left.authorityLevel];
  if (authority) return authority;
  if (left.fieldName === "officialWebsiteUrl" && right.fieldName === "officialWebsiteUrl") {
    const protocol = protocolRank(right.value) - protocolRank(left.value);
    if (protocol) return protocol;
    const verifiedDomain = verifiedSameDomainRank(right) - verifiedSameDomainRank(left);
    if (verifiedDomain) return verifiedDomain;
  }
  const confidence = right.confidence - left.confidence;
  if (confidence) return confidence;
  const observed = right.observedAt.getTime() - left.observedAt.getTime();
  if (observed) return observed;
  return stableKey(left).localeCompare(stableKey(right));
}

export function selectPreferredClaim<T extends ComparableClaim>(claims: readonly T[]): T {
  if (!claims.length) throw new Error("Cannot select a preferred claim from an empty group.");
  return [...claims].sort(compareClaimsByPrecedence)[0];
}
