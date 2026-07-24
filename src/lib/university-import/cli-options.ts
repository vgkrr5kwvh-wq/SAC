import { normalizeSourceName } from "./normalizers";
import type { UniversityImportSourceName } from "./types";

export type PilotCliOptions = {
  source: UniversityImportSourceName;
  limit: number;
  dryRun: boolean;
  fixture: string | null;
  country: string | null;
};

export function parsePilotCliOptions(args: readonly string[]): PilotCliOptions {
  let sourceValue: string | null = null;
  let limitValue: string | null = null;
  let dryRun = false;
  let fixture: string | null = null;
  let countryValue: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--source") {
      sourceValue = args[++index] ?? null;
    } else if (argument === "--limit") {
      limitValue = args[++index] ?? null;
    } else if (argument === "--fixture") {
      fixture = args[++index] ?? null;
    } else if (argument === "--country") {
      countryValue = args[++index] ?? null;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  const source = sourceValue ? normalizeSourceName(sourceValue) : null;
  if (!source) throw new Error("--source must be university-study or studies-overseas.");
  const limit = limitValue === null ? 5 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
    throw new Error("--limit must be an integer from 1 to 5 during Phase 1.");
  }
  if (fixture && !dryRun) throw new Error("--fixture may only be used with --dry-run.");
  const country = countryValue?.trim().toUpperCase() || (source === "university-study" ? "USA" : null);
  return { source, limit, dryRun, fixture, country };
}

export function assertImportEnabled(
  options: PilotCliOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (!options.dryRun && environment.UNIVERSITY_IMPORT_ENABLED !== "true") {
    throw new Error("University imports are disabled. Set UNIVERSITY_IMPORT_ENABLED=true explicitly for a non-dry pilot.");
  }
}
