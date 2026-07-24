import { z } from "zod";
import type {
  NormalizedUniversityRecord,
  UniversitySourceAdapter,
  UniversityValidationResult,
} from "./types";

const normalizedUniversitySchema = z.object({
  sourceName: z.enum(["university-study", "studies-overseas"]),
  sourceUniversityUrl: z.url(),
  name: z.string().trim().min(2),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  officialWebsiteUrl: z.url().nullable(),
  scholarships: z.array(z.object({
    scholarshipAvailable: z.enum(["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]),
    sourceUrl: z.url(),
    scholarshipUrl: z.url().nullable(),
  }).passthrough()),
}).passthrough();

export function validateNormalizedUniversity(
  value: NormalizedUniversityRecord,
): UniversityValidationResult {
  const result = normalizedUniversitySchema.safeParse(value);
  const errors = result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`);
  const missingFields = [
    ["country", value.country],
    ["state", value.state],
    ["city", value.city],
    ["address", value.address],
    ["institutionType", value.institutionType],
    ["foundedYear", value.foundedYear],
    ["description", value.description],
    ["officialWebsiteUrl", value.officialWebsiteUrl],
    ["logoUrl", value.logoUrl],
  ].filter(([, fieldValue]) => fieldValue === null).map(([field]) => String(field));
  return { valid: errors.length === 0, errors, missingFields };
}

export function assertValidSourceAdapter(adapter: UniversitySourceAdapter): void {
  if (!adapter || typeof adapter !== "object") throw new Error("Source adapter is required.");
  if (adapter.sourceName !== "university-study" && adapter.sourceName !== "studies-overseas") {
    throw new Error("Source adapter has an unsupported sourceName.");
  }
  for (const method of ["discoverUniversityUrls", "extractUniversity", "normalizeUniversity", "validateUniversity"] as const) {
    if (typeof adapter[method] !== "function") throw new Error(`Source adapter is missing ${method}().`);
  }
}

