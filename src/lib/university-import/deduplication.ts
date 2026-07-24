import type { NormalizedUniversityRecord } from "./types";
import { normalizeLocation, normalizeUniversityName, officialDomain } from "./normalizers";

export type ExistingPrismaUniversityCandidate = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  officialWebsiteUrl: string | null;
  aliases?: string[];
};

export type DeduplicationDecision =
  | { kind: "AUTO_MATCH"; universityId: string; reason: "official-domain" | "strong-name-location" }
  | { kind: "NEW"; reason: "no-candidate" }
  | { kind: "MANUAL_REVIEW"; universityId: string | null; warning: string };

function namesMatch(incoming: NormalizedUniversityRecord, candidate: ExistingPrismaUniversityCandidate): boolean {
  const incomingNames = [incoming.name, ...incoming.aliases].map(normalizeUniversityName);
  const candidateNames = [candidate.name, ...(candidate.aliases ?? [])].map(normalizeUniversityName);
  return incomingNames.some((name) => name.length > 2 && candidateNames.includes(name));
}

export function deduplicateUniversity(
  incoming: NormalizedUniversityRecord,
  candidates: readonly ExistingPrismaUniversityCandidate[],
): DeduplicationDecision {
  const incomingDomain = incoming.officialDomain;
  if (incomingDomain) {
    const domainMatches = candidates.filter((candidate) => officialDomain(candidate.officialWebsiteUrl) === incomingDomain);
    if (domainMatches.length === 1) {
      return { kind: "AUTO_MATCH", universityId: domainMatches[0].id, reason: "official-domain" };
    }
    if (domainMatches.length > 1) {
      return { kind: "MANUAL_REVIEW", universityId: domainMatches[0].id, warning: "Multiple records share the verified official domain." };
    }
  }

  const nameMatches = candidates.filter((candidate) => namesMatch(incoming, candidate));
  const strongMatches = nameMatches.filter((candidate) => {
    const cityMatches = Boolean(incoming.city && normalizeLocation(incoming.city) === normalizeLocation(candidate.city));
    const stateMatches = Boolean(incoming.state && normalizeLocation(incoming.state) === normalizeLocation(candidate.state));
    const conflictingDomain = Boolean(
      incomingDomain
      && officialDomain(candidate.officialWebsiteUrl)
      && incomingDomain !== officialDomain(candidate.officialWebsiteUrl),
    );
    return !conflictingDomain && (cityMatches || stateMatches) && Boolean(incoming.city || incoming.state);
  });
  if (strongMatches.length === 1) {
    return { kind: "AUTO_MATCH", universityId: strongMatches[0].id, reason: "strong-name-location" };
  }
  if (nameMatches.length > 0) {
    return {
      kind: "MANUAL_REVIEW",
      universityId: strongMatches[0]?.id ?? nameMatches[0].id,
      warning: strongMatches.length > 1
        ? "Multiple strong name and location matches require review."
        : "Name similarity is insufficient for an automatic merge.",
    };
  }
  return { kind: "NEW", reason: "no-candidate" };
}

