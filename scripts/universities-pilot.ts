import { assertImportEnabled, parsePilotCliOptions } from "../src/lib/university-import/cli-options";
import { safeErrorMessage, safeImportLog } from "../src/lib/university-import/logging";
import { runUniversityPilot } from "../src/lib/university-import/runner";

async function main() {
  const options = parsePilotCliOptions(process.argv.slice(2));
  assertImportEnabled(options);
  const summary = await runUniversityPilot(options);
  safeImportLog("university-import-complete", {
    source: summary.sourceName,
    dryRun: summary.dryRun,
    discovered: summary.discoveredCount,
    imported: summary.importedCount,
    updated: summary.updatedCount,
    skipped: summary.skippedCount,
    manualReview: summary.manualReviewCount,
    failed: summary.failedCount,
  });
  if (summary.failedCount > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`University import stopped: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});

