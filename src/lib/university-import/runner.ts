import { readFile } from "node:fs/promises";
import type { Prisma, PrismaClient } from "@prisma/client";
import { conservativeDelay } from "./browser";
import type { PilotCliOptions } from "./cli-options";
import { deduplicateUniversity } from "./deduplication";
import { deterministicDataHash } from "./hashing";
import { safeErrorMessage, safeImportLog } from "./logging";
import { findUniversityCandidates, persistImportRecord } from "./repository";
import { getUniversitySourceAdapter } from "./sources";
import { extractStudiesOverseasHtml } from "./sources/studies-overseas/extract";
import { extractUniversityStudyHtml } from "./sources/university-study/extract";
import type { UniversitySourceAdapter } from "./types";
import { assertValidSourceAdapter } from "./validation";

export type PilotSummary = {
  sourceName: string;
  dryRun: boolean;
  discoveredCount: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  manualReviewCount: number;
  failedCount: number;
};

export type PilotRunnerDependencies = {
  adapter?: UniversitySourceAdapter;
  database?: PrismaClient;
};

async function fixtureExtraction(options: PilotCliOptions, adapter: UniversitySourceAdapter) {
  if (!options.fixture) return null;
  const html = await readFile(options.fixture, "utf8");
  const fixtureUrl = `https://fixtures.invalid/${options.source}/university-profile`;
  return {
    urls: [fixtureUrl],
    extract: async () => options.source === "university-study"
      ? extractUniversityStudyHtml(html, fixtureUrl)
      : extractStudiesOverseasHtml(html, fixtureUrl),
    adapter,
  };
}

export async function runUniversityPilot(
  options: PilotCliOptions,
  dependencies: PilotRunnerDependencies = {},
): Promise<PilotSummary> {
  const adapter = dependencies.adapter ?? getUniversitySourceAdapter(options.source);
  assertValidSourceAdapter(adapter);
  const fixture = await fixtureExtraction(options, adapter);
  const maximumAttempts = Math.min(10, options.limit * 2);
  const urls = fixture?.urls ?? await adapter.discoverUniversityUrls({
    limit: options.limit,
    country: options.country,
    maxAttempts: maximumAttempts,
  });
  const attemptUrls = urls.slice(0, maximumAttempts);
  const summary: PilotSummary = {
    sourceName: options.source,
    dryRun: options.dryRun,
    discoveredCount: attemptUrls.length,
    importedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    manualReviewCount: 0,
    failedCount: 0,
  };

  let database = dependencies.database;
  let importJobId: string | null = null;
  if (!options.dryRun) {
    database ??= (await import("@/lib/prisma")).prisma;
    const job = await database.importJob.create({
      data: {
        sourceName: options.source,
        status: "RUNNING",
        mode: "PILOT",
        startedAt: new Date(),
        discoveredCount: attemptUrls.length,
      },
      select: { id: true },
    });
    importJobId = job.id;
  }

  let successfulRecords = 0;
  for (const [index, sourceUrl] of attemptUrls.entries()) {
    let rawPayload: unknown = {};
    let recordSucceeded = false;
    try {
      const raw = fixture ? await fixture.extract() : await adapter.extractUniversity(sourceUrl);
      rawPayload = raw;
      const normalized = adapter.normalizeUniversity(raw);
      const validation = adapter.validateUniversity(normalized);
      const hash = deterministicDataHash(normalized);
      if (options.dryRun) {
        if (!validation.valid) summary.failedCount += 1;
        else {
          summary.importedCount += 1;
          recordSucceeded = true;
        }
        safeImportLog("university-import-dry-run-record", {
          source: options.source,
          sourceUrl,
          name: normalized.name,
          valid: validation.valid,
          missingFieldCount: validation.missingFields.length,
          hash,
        });
      } else {
        if (!database || !importJobId) throw new Error("Import persistence is unavailable.");
        const candidates = await findUniversityCandidates(database, normalized);
        const deduplication = deduplicateUniversity(normalized, candidates);
        const result = await persistImportRecord(database, {
          importJobId,
          raw,
          normalized,
          validation,
          hash,
          deduplication,
        });
        if (result === "imported") summary.importedCount += 1;
        else if (result === "updated") summary.updatedCount += 1;
        else if (result === "skipped") summary.skippedCount += 1;
        else summary.manualReviewCount += 1;
        recordSucceeded = true;
      }
    } catch (error) {
      summary.failedCount += 1;
      const message = safeErrorMessage(error);
      safeImportLog("university-import-record-failed", { source: options.source, sourceUrl, error: message });
      if (database && importJobId) {
        await database.importRecord.create({
          data: {
            importJobId,
            sourceUrl,
            entityType: "university",
            status: "FAILED",
            rawPayload: rawPayload as Prisma.InputJsonValue,
            normalizedPayload: {},
            errorMessage: message,
          },
        });
      }
    }
    if (recordSucceeded) successfulRecords += 1;
    if (successfulRecords >= options.limit) break;
    if (!fixture && index < attemptUrls.length - 1) await conservativeDelay();
  }

  if (database && importJobId) {
    await database.importJob.update({
      where: { id: importJobId },
      data: {
        status: summary.failedCount > 0 ? "COMPLETED_WITH_ERRORS" : "COMPLETED",
        completedAt: new Date(),
        importedCount: summary.importedCount,
        updatedCount: summary.updatedCount,
        skippedCount: summary.skippedCount + summary.manualReviewCount,
        failedCount: summary.failedCount,
        errorSummary: summary.failedCount ? `${summary.failedCount} university record(s) failed. Review ImportRecord details.` : null,
      },
    });
  }
  return summary;
}
