import { z } from "zod";
import type { CatalogIngestionIssue } from "./errors";
import {
  assessCatalogFreshness,
  defaultVerificationFreshnessPolicy,
  type VerificationFreshnessPolicy,
} from "./freshness";
import { normalizeRawUniversityCatalog } from "./normalization";
import {
  universityCatalogRecordSchema,
  validateUniversityCatalogInvariants,
} from "./schema";
import type { University } from "./types";

export const supportedCatalogSchemaVersions = [1] as const;
export type SupportedCatalogSchemaVersion = typeof supportedCatalogSchemaVersions[number];

export type RawUniversityCatalogInput = {
  schemaVersion: unknown;
  universities: unknown;
};

export type CatalogIngestionMetadata = {
  schemaVersion: SupportedCatalogSchemaVersion | number | null;
  universityCount: number;
  programCount: number;
  activeProgramCount: number;
  sampleRecordCount: number;
  verifiedRecordCount: number;
  staleRecordCount: number;
  unverifiedRecordCount: number;
  ingestedAt: string;
};

export type CatalogIngestionSuccess = {
  success: true;
  catalog: readonly University[];
  warnings: readonly CatalogIngestionIssue[];
  metadata: CatalogIngestionMetadata;
};

export type CatalogIngestionFailure = {
  success: false;
  errors: readonly CatalogIngestionIssue[];
  warnings: readonly CatalogIngestionIssue[];
  metadata: CatalogIngestionMetadata;
};

export type CatalogIngestionResult = CatalogIngestionSuccess | CatalogIngestionFailure;

const rawEnvelopeSchema = z.object({
  schemaVersion: z.number().int(),
  universities: z.array(z.unknown()),
}).strict();

function emptyMetadata(referenceDate: Date, schemaVersion: number | null): CatalogIngestionMetadata {
  return {
    schemaVersion,
    universityCount: 0,
    programCount: 0,
    activeProgramCount: 0,
    sampleRecordCount: 0,
    verifiedRecordCount: 0,
    staleRecordCount: 0,
    unverifiedRecordCount: 0,
    ingestedAt: referenceDate.toISOString(),
  };
}

function issueContext(
  input: unknown,
  path: readonly PropertyKey[],
): Pick<CatalogIngestionIssue, "universitySlug" | "programSlug"> {
  if (typeof input !== "object" || input === null || !("universities" in input)) return {};
  const universities = (input as { universities?: unknown }).universities;
  if (!Array.isArray(universities)) return {};
  const universityIndex = typeof path[1] === "number" && path[0] === "universities" ? path[1] : undefined;
  const university = universityIndex === undefined ? undefined : universities[universityIndex];
  if (typeof university !== "object" || university === null) return {};
  const universitySlug = "slug" in university && typeof university.slug === "string" ? university.slug : undefined;
  const programMarker = path.indexOf("programs");
  const programIndex = programMarker >= 0 && typeof path[programMarker + 1] === "number" ? path[programMarker + 1] as number : undefined;
  const programs = "programs" in university && Array.isArray(university.programs) ? university.programs : [];
  const program = programIndex === undefined ? undefined : programs[programIndex];
  const programSlug = typeof program === "object" && program !== null && "slug" in program && typeof program.slug === "string"
    ? program.slug
    : undefined;
  return { ...(universitySlug ? { universitySlug } : {}), ...(programSlug ? { programSlug } : {}) };
}

function mapSchemaIssues(input: unknown, issues: readonly z.core.$ZodIssue[]): CatalogIngestionIssue[] {
  return issues.map((issue) => {
    const path = issue.path.map((segment) => typeof segment === "symbol" ? String(segment) : segment);
    const verificationIssue = path.includes("verification")
      || path.includes("lastReviewedAt")
      || path.includes("sourceUrl");
    return {
      code: verificationIssue ? "invalid-verification-metadata" : "schema-validation",
      severity: "error",
      path,
      message: issue.message,
      ...issueContext(input, path),
      suggestedRemediation: verificationIssue
        ? "Provide policy-compliant verification status, source, review date, and URL values."
        : "Correct the value at the reported path and ingest the complete catalog again.",
    };
  });
}

export type IngestUniversityCatalogOptions = {
  referenceDate: Date;
  freshnessPolicy?: VerificationFreshnessPolicy;
};

export function ingestUniversityCatalog(
  rawInput: unknown,
  options: IngestUniversityCatalogOptions,
): CatalogIngestionResult {
  const envelopeResult = rawEnvelopeSchema.safeParse(rawInput);
  const rawVersion = typeof rawInput === "object" && rawInput !== null && "schemaVersion" in rawInput
    && typeof rawInput.schemaVersion === "number" ? rawInput.schemaVersion : null;
  if (!envelopeResult.success) {
    return {
      success: false,
      errors: mapSchemaIssues(rawInput, envelopeResult.error.issues),
      warnings: [],
      metadata: emptyMetadata(options.referenceDate, rawVersion),
    };
  }
  if (!supportedCatalogSchemaVersions.includes(envelopeResult.data.schemaVersion as SupportedCatalogSchemaVersion)) {
    return {
      success: false,
      errors: [{
        code: "unsupported-value",
        severity: "error",
        path: ["schemaVersion"],
        message: `Unsupported catalog schema version: ${envelopeResult.data.schemaVersion}.`,
        originalValue: envelopeResult.data.schemaVersion,
        suggestedRemediation: `Use one of the supported versions: ${supportedCatalogSchemaVersions.join(", ")}.`,
      }],
      warnings: [],
      metadata: emptyMetadata(options.referenceDate, envelopeResult.data.schemaVersion),
    };
  }

  const normalized = normalizeRawUniversityCatalog(envelopeResult.data);
  const normalizedEnvelope = rawEnvelopeSchema.parse(normalized.value);
  const catalogResult = z.array(universityCatalogRecordSchema).safeParse(normalizedEnvelope.universities);
  if (!catalogResult.success) {
    const prefixedIssues = catalogResult.error.issues.map((issue) => ({ ...issue, path: ["universities", ...issue.path] }));
    return {
      success: false,
      errors: mapSchemaIssues(normalized.value, prefixedIssues),
      warnings: normalized.warnings,
      metadata: emptyMetadata(options.referenceDate, normalizedEnvelope.schemaVersion),
    };
  }

  const invariants = validateUniversityCatalogInvariants(catalogResult.data);
  if (invariants.length > 0) {
    const errors: CatalogIngestionIssue[] = invariants.map((issue) => {
      const path = ["universities", ...issue.path];
      return {
        code: issue.code.startsWith("duplicate-") ? "duplicate-identifier" : "invariant-violation",
        severity: "error",
        path,
        message: issue.message,
        ...issueContext(normalized.value, path),
        suggestedRemediation: "Resolve the catalog-wide conflict; no records were discarded.",
      };
    });
    return {
      success: false,
      errors,
      warnings: normalized.warnings,
      metadata: emptyMetadata(options.referenceDate, normalizedEnvelope.schemaVersion),
    };
  }

  const catalog = catalogResult.data;
  const freshness = assessCatalogFreshness(
    catalog,
    options.referenceDate,
    options.freshnessPolicy ?? defaultVerificationFreshnessPolicy,
  );
  const programs = catalog.flatMap((university) => university.programs);
  return {
    success: true,
    catalog,
    warnings: [...normalized.warnings, ...freshness.warnings],
    metadata: {
      schemaVersion: normalizedEnvelope.schemaVersion,
      universityCount: catalog.length,
      programCount: programs.length,
      activeProgramCount: catalog.reduce(
        (count, university) => count + (university.active ? university.programs.filter((program) => program.active).length : 0),
        0,
      ),
      sampleRecordCount: catalog.filter((university) => university.sampleRecord).length,
      verifiedRecordCount: freshness.verifiedRecordCount,
      staleRecordCount: freshness.staleRecordCount,
      unverifiedRecordCount: freshness.unverifiedRecordCount,
      ingestedAt: options.referenceDate.toISOString(),
    },
  };
}
