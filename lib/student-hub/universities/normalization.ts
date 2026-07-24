import type { CatalogIngestionIssue } from "./errors";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSlug(value: string): string {
  return compactWhitespace(value)
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeCatalogSubject(value: string): string {
  return compactWhitespace(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return trimmed;
  }
}

function safeOriginal(value: unknown): string | number | boolean | null | undefined {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
    ? value
    : undefined;
}

export type CatalogNormalizationResult = {
  value: unknown;
  warnings: readonly CatalogIngestionIssue[];
};

export function normalizeRawUniversityCatalog(rawInput: unknown): CatalogNormalizationResult {
  const warnings: CatalogIngestionIssue[] = [];

  const changed = (
    path: readonly (string | number)[],
    before: unknown,
    after: unknown,
    universitySlug?: string,
    programSlug?: string,
  ) => {
    if (before === after) return after;
    warnings.push({
      code: "normalization-warning",
      severity: "warning",
      path,
      message: "A safe structural value was normalized.",
      ...(universitySlug ? { universitySlug } : {}),
      ...(programSlug ? { programSlug } : {}),
      ...(safeOriginal(before) !== undefined ? { originalValue: safeOriginal(before) } : {}),
      suggestedRemediation: "Store the normalized value at the source to avoid repeated warnings.",
    });
    return after;
  };

  if (!isRecord(rawInput) || !Array.isArray(rawInput.universities)) return { value: rawInput, warnings };
  const envelope: JsonRecord = { ...rawInput };
  envelope.universities = rawInput.universities.map((entry, universityIndex) => {
    if (!isRecord(entry)) return entry;
    const university: JsonRecord = { ...entry };
    const universityPath = ["universities", universityIndex] as const;
    if (typeof university.slug === "string") university.slug = changed([...universityPath, "slug"], university.slug, normalizeSlug(university.slug));
    const universitySlug = typeof university.slug === "string" ? university.slug : undefined;
    for (const field of ["name", "city"] as const) {
      if (typeof university[field] === "string") university[field] = changed([...universityPath, field], university[field], compactWhitespace(university[field]), universitySlug);
    }
    if (typeof university.country === "string") university.country = changed([...universityPath, "country"], university.country, university.country.trim().toUpperCase(), universitySlug);
    for (const field of ["website", "logo"] as const) {
      if (typeof university[field] === "string") university[field] = changed([...universityPath, field], university[field], normalizeUrl(university[field]), universitySlug);
    }
    if (!Array.isArray(university.programs)) return university;
    university.programs = university.programs.map((entryProgram, programIndex) => {
      if (!isRecord(entryProgram)) return entryProgram;
      const program: JsonRecord = { ...entryProgram };
      const programPath = [...universityPath, "programs", programIndex] as const;
      if (typeof program.slug === "string") program.slug = changed([...programPath, "slug"], program.slug, normalizeSlug(program.slug), universitySlug);
      const programSlug = typeof program.slug === "string" ? program.slug : undefined;
      for (const field of ["name", "subject"] as const) {
        if (typeof program[field] === "string") program[field] = changed([...programPath, field], program[field], compactWhitespace(program[field]), universitySlug, programSlug);
      }
      if (Array.isArray(program.subjectAliases)) {
        const seen = new Set<string>();
        const aliases = program.subjectAliases
          .filter((alias): alias is string => typeof alias === "string")
          .map(compactWhitespace)
          .filter((alias) => {
            const key = alias.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        if (JSON.stringify(aliases) !== JSON.stringify(program.subjectAliases)) {
          changed([...programPath, "subjectAliases"], JSON.stringify(program.subjectAliases), JSON.stringify(aliases), universitySlug, programSlug);
        }
        program.subjectAliases = aliases;
      }
      const normalizeNested = (value: unknown, path: readonly (string | number)[]): unknown => {
        if (Array.isArray(value)) return value.map((item, index) => normalizeNested(item, [...path, index]));
        if (!isRecord(value)) return value;
        const result: JsonRecord = {};
        Object.entries(value).forEach(([key, nestedValue]) => {
          if (key === "currency" && typeof nestedValue === "string") {
            result[key] = changed([...path, key], nestedValue, nestedValue.trim().toUpperCase(), universitySlug, programSlug);
          } else if (key === "sourceUrl" && typeof nestedValue === "string") {
            result[key] = changed([...path, key], nestedValue, normalizeUrl(nestedValue), universitySlug, programSlug);
          } else {
            result[key] = normalizeNested(nestedValue, [...path, key]);
          }
        });
        return result;
      };
      Object.assign(program, normalizeNested(program, programPath));
      return program;
    });
    return university;
  });
  return { value: envelope, warnings };
}
