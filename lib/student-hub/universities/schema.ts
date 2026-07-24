import { z } from "zod";
import type { University } from "./types";

const isoDate = z.string().refine(
  (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)),
  "Expected a valid ISO date in YYYY-MM-DD format.",
);
const optionalUrl = z.union([z.url(), z.null()]);
const nullableText = z.union([z.string().trim().min(1), z.null()]);

export const verificationMetadataSchema = z.object({
  verificationStatus: z.enum(["verified", "partially-verified", "unverified"]),
  sourceType: z.enum(["official-university", "official-government", "partner", "internal", "sample"]),
  lastReviewedAt: z.union([isoDate, z.null()]),
  sourceUrl: optionalUrl,
  notes: nullableText,
}).strict().superRefine((value, context) => {
  if (value.verificationStatus === "verified" && !value.sourceUrl) {
    context.addIssue({ code: "custom", path: ["verificationStatus"], message: "Verified metadata requires sourceUrl." });
  }
  if (value.sourceType === "sample" && value.verificationStatus === "verified") {
    context.addIssue({ code: "custom", path: ["sourceType"], message: "Sample sources cannot be marked verified." });
  }
});

export const academicRequirementSchema = z.object({
  gradingSystem: z.string().trim().min(1),
  minimumScore: z.number().nonnegative(),
  maximumScale: z.number().positive(),
  qualificationLevel: nullableText,
  verification: verificationMetadataSchema,
}).strict().superRefine((value, context) => {
  if (value.minimumScore > value.maximumScale) {
    context.addIssue({ code: "custom", path: ["minimumScore"], message: "Minimum score cannot exceed maximum scale." });
  }
});

const scoreSchema = z.number().nonnegative();
export const englishRequirementSchema = z.object({
  testType: z.enum(["IELTS", "TOEFL", "PTE", "DUOLINGO", "OTHER"]),
  minimumOverallScore: scoreSchema,
  componentScores: z.union([z.object({
    listening: scoreSchema.optional(),
    reading: scoreSchema.optional(),
    writing: scoreSchema.optional(),
    speaking: scoreSchema.optional(),
  }).strict(), z.null()]),
  alternativeGroup: z.union([z.string().trim().min(1), z.null()]),
  verification: verificationMetadataSchema,
}).strict().superRefine((value, context) => {
  const ranges = { IELTS: [0, 9], TOEFL: [0, 120], PTE: [10, 90], DUOLINGO: [10, 160], OTHER: [0, Number.MAX_SAFE_INTEGER] } as const;
  const [minimum, maximum] = ranges[value.testType];
  const scores = [value.minimumOverallScore, ...Object.values(value.componentScores ?? {})];
  if (scores.some((score) => score < minimum || score > maximum)) {
    context.addIssue({ code: "custom", path: ["minimumOverallScore"], message: `Scores are outside the valid ${value.testType} range.` });
  }
});

export const tuitionSchema = z.object({
  amount: z.union([z.number().nonnegative(), z.null()]),
  minimumAmount: z.union([z.number().nonnegative(), z.null()]),
  currency: z.enum(["USD", "CAD", "GBP", "KRW"]),
  period: z.enum(["academic-year", "semester", "term", "full-program", "credit-hour", "unknown"]),
  verification: verificationMetadataSchema,
}).strict().superRefine((value, context) => {
  if (value.amount === null && value.minimumAmount === null) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Tuition requires amount or minimumAmount; use null for missing tuition." });
  }
});

export const intakeSchema = z.object({
  month: z.union([z.number().int().min(1).max(12), z.null()]),
  namedPeriod: nullableText,
  year: z.union([z.number().int().min(2000).max(2200), z.null()]),
  status: z.enum(["open", "closed", "expected", "unknown"]),
  verification: verificationMetadataSchema,
}).strict().superRefine((value, context) => {
  if (value.month === null && value.namedPeriod === null) {
    context.addIssue({ code: "custom", path: ["month"], message: "Intake requires a month or named period." });
  }
});

export const scholarshipSchema = z.object({
  state: z.enum(["available", "unavailable", "unknown"]),
  type: nullableText,
  amount: z.union([z.number().nonnegative(), z.null()]),
  currency: z.union([z.enum(["USD", "CAD", "GBP", "KRW"]), z.null()]),
  eligibilityNotes: nullableText,
  sourceUrl: optionalUrl,
  lastReviewedAt: z.union([isoDate, z.null()]),
  verification: verificationMetadataSchema,
}).strict().superRefine((value, context) => {
  if ((value.amount === null) !== (value.currency === null)) {
    context.addIssue({ code: "custom", path: ["currency"], message: "Scholarship amount and currency must be provided together." });
  }
});

export const previousQualificationRequirementSchema = z.object({
  qualificationLevel: z.string().trim().min(1),
  state: z.enum(["accepted", "not-accepted", "requires-review", "unknown"]),
  verification: verificationMetadataSchema,
}).strict();

export const programSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1),
  subject: z.string().trim().min(1),
  subjectAliases: z.array(z.string().trim().min(1)),
  studyLevel: z.enum(["foundation", "associate", "bachelor", "postgraduate-certificate", "master", "doctorate"]),
  previousQualificationRequirements: z.array(previousQualificationRequirementSchema),
  academicRequirements: z.array(academicRequirementSchema),
  englishRequirements: z.array(englishRequirementSchema),
  tuition: z.union([tuitionSchema, z.null()]),
  intakes: z.array(intakeSchema),
  scholarship: scholarshipSchema,
  locationClassification: z.enum(["urban", "suburban", "regional", "rural", "unknown"]),
  active: z.boolean(),
  verification: verificationMetadataSchema,
}).strict();

export const universityCatalogRecordSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1),
  country: z.enum(["US", "CA", "GB", "KR"]),
  city: z.string().trim().min(1),
  website: z.url(),
  logo: optionalUrl,
  active: z.boolean(),
  featured: z.boolean(),
  sampleRecord: z.boolean(),
  subjectCoverage: z.enum(["verified-complete", "partial", "unknown"]),
  verification: verificationMetadataSchema,
  programs: z.array(programSchema),
}).strict();

export type CatalogInvariantIssue = {
  code: "duplicate-university-id" | "duplicate-university-slug" | "duplicate-program-id" | "duplicate-program-slug" | "inactive-university-active-program" | "ambiguous-english-requirements";
  path: readonly (string | number)[];
  message: string;
};

export function validateUniversityCatalogInvariants(catalog: readonly University[]): CatalogInvariantIssue[] {
  const issues: CatalogInvariantIssue[] = [];
  const universityIds = new Set<string>();
  const universitySlugs = new Set<string>();
  const programIds = new Set<string>();
  const programSlugs = new Set<string>();

  catalog.forEach((university, universityIndex) => {
    if (universityIds.has(university.id)) issues.push({ code: "duplicate-university-id", path: [universityIndex, "id"], message: `Duplicate university id: ${university.id}` });
    if (universitySlugs.has(university.slug)) issues.push({ code: "duplicate-university-slug", path: [universityIndex, "slug"], message: `Duplicate university slug: ${university.slug}` });
    universityIds.add(university.id);
    universitySlugs.add(university.slug);

    university.programs.forEach((program, programIndex) => {
      const path = [universityIndex, "programs", programIndex] as const;
      if (programIds.has(program.id)) issues.push({ code: "duplicate-program-id", path: [...path, "id"], message: `Duplicate program id: ${program.id}` });
      if (programSlugs.has(program.slug)) issues.push({ code: "duplicate-program-slug", path: [...path, "slug"], message: `Duplicate program slug: ${program.slug}` });
      if (!university.active && program.active) issues.push({ code: "inactive-university-active-program", path: [...path, "active"], message: "Inactive universities cannot contain active programs." });
      programIds.add(program.id);
      programSlugs.add(program.slug);

      const requirementsByTest = new Map<string, typeof program.englishRequirements>();
      program.englishRequirements.forEach((requirement) => {
        requirementsByTest.set(requirement.testType, [...(requirementsByTest.get(requirement.testType) ?? []), requirement]);
      });
      requirementsByTest.forEach((requirements, testType) => {
        if (requirements.length < 2) return;
        const groups = new Set(requirements.map((requirement) => requirement.alternativeGroup));
        const unambiguous = groups.size === 1 && !groups.has(null);
        if (!unambiguous) issues.push({ code: "ambiguous-english-requirements", path: [...path, "englishRequirements"], message: `Duplicate ${testType} requirements require one shared alternativeGroup.` });
      });
    });
  });
  return issues;
}

export const universityCatalogSchema = z.array(universityCatalogRecordSchema).superRefine((catalog, context) => {
  validateUniversityCatalogInvariants(catalog).forEach((issue) => {
    context.addIssue({ code: "custom", path: [...issue.path], message: issue.message });
  });
});

export type UniversityCatalogInput = z.input<typeof universityCatalogSchema>;
export type UniversityCatalog = z.output<typeof universityCatalogSchema>;

export function parseUniversityCatalog(input: unknown): UniversityCatalog {
  return universityCatalogSchema.parse(input);
}

export function safeParseUniversityCatalog(input: unknown) {
  return universityCatalogSchema.safeParse(input);
}
