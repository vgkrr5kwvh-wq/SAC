import type {
  NormalizedScholarship,
  RawScholarship,
  UniversityImportSourceName,
} from "./types";

export function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeUniversityName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(the|univ|university|college|institute|of)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocation(value: string | null | undefined): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() : null;
}

export function safeUrl(value: unknown, baseUrl?: string): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  try {
    const url = baseUrl ? new URL(cleaned, baseUrl) : new URL(cleaned);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function officialDomain(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function parseOptionalNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  const match = cleaned.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

export function parseMoneyRange(value: string | null): {
  minimumAmount: number | null;
  maximumAmount: number | null;
  currency: string | null;
} {
  if (!value) return { minimumAmount: null, maximumAmount: null, currency: null };
  const currency = /\bUSD\b|\$/i.test(value) ? "USD"
    : /\bGBP\b|£/i.test(value) ? "GBP"
      : /\bEUR\b|€/i.test(value) ? "EUR"
        : /\bCAD\b/i.test(value) ? "CAD"
          : null;
  const amounts = [...value.replace(/,/g, "").matchAll(/\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  return {
    minimumAmount: amounts[0] ?? null,
    maximumAmount: amounts.length > 1 ? amounts[amounts.length - 1] : amounts[0] ?? null,
    currency,
  };
}

export function mapScholarship(
  raw: RawScholarship,
  sourceUrl: string,
): NormalizedScholarship {
  const availabilityEvidence = cleanText(raw.availabilityEvidence);
  const positiveEvidence = Boolean(
    cleanText(raw.name)
    || cleanText(raw.amountText)
    || cleanText(raw.eligibilityText)
    || safeUrl(raw.scholarshipUrl, sourceUrl)
    || availabilityEvidence,
  );
  const scholarshipAvailable = raw.explicitlyUnavailable === true
    ? "UNAVAILABLE"
    : positiveEvidence
      ? "AVAILABLE"
      : "UNKNOWN";
  const amountText = cleanText(raw.amountText);
  const amounts = parseMoneyRange(amountText);
  return {
    name: cleanText(raw.name),
    scholarshipAvailable,
    amountText,
    minimumAmount: amounts.minimumAmount,
    maximumAmount: amounts.maximumAmount,
    currency: amounts.currency,
    scholarshipType: null,
    eligibilityText: cleanText(raw.eligibilityText),
    minimumGpa: parseOptionalNumber(raw.minimumGpa),
    isAutomatic: raw.isAutomatic ?? null,
    requiresSeparateApplication: raw.requiresSeparateApplication ?? null,
    isRenewable: raw.isRenewable ?? null,
    renewalCriteria: cleanText(raw.renewalCriteria),
    deadlineText: cleanText(raw.deadlineText),
    scholarshipUrl: safeUrl(raw.scholarshipUrl, sourceUrl),
    sourceUrl,
  };
}

export function normalizeSourceName(value: string): UniversityImportSourceName | null {
  return value === "university-study" || value === "studies-overseas" ? value : null;
}

