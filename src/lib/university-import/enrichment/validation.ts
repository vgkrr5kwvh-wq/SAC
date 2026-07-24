import { z } from "zod";

export const enrichmentCliSchema = z.object({
  universityId: z.string().cuid().optional(),
  source: z.literal("university-study").optional(),
  limit: z.literal(1).default(1),
  country: z.string().trim().min(2).max(80).default("USA"),
  dryRun: z.boolean().default(false),
  fixtureDirectory: z.string().trim().min(1).optional(),
  debugHtml: z.boolean().default(false),
}).refine((value) => Boolean(value.universityId || value.source), {
  message: "Provide --university-id or --source university-study.",
});

export type EnrichmentCliOptions = z.output<typeof enrichmentCliSchema>;

export function parseEnrichmentCliOptions(args: readonly string[]): EnrichmentCliOptions {
  const input: Record<string, unknown> = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") input.dryRun = true;
    else if (argument === "--university-id") input.universityId = args[++index];
    else if (argument === "--source") input.source = args[++index];
    else if (argument === "--limit") input.limit = Number(args[++index]);
    else if (argument === "--country") input.country = args[++index];
    else if (argument === "--fixture-directory") input.fixtureDirectory = args[++index];
    else if (argument === "--debug-html") input.debugHtml = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return enrichmentCliSchema.parse(input);
}

export function assertEnrichmentEnabled(
  options: EnrichmentCliOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (!options.dryRun && environment.UNIVERSITY_IMPORT_ENABLED !== "true") {
    throw new Error("University enrichment is disabled. Set UNIVERSITY_IMPORT_ENABLED=true explicitly.");
  }
}
