import assert from "node:assert/strict";
import test from "node:test";
import { assertImportEnabled, parsePilotCliOptions } from "../src/lib/university-import/cli-options";
import { runUniversityPilot } from "../src/lib/university-import/runner";
import type { UniversitySourceAdapter } from "../src/lib/university-import/types";
import { mapUniversityStudyUniversity } from "../src/lib/university-import/sources/university-study/map";
import { validateNormalizedUniversity } from "../src/lib/university-import/validation";

test("defaults pilot limit to five and rejects unsafe limits", () => {
  const defaults = parsePilotCliOptions(["--source", "university-study", "--dry-run"]);
  assert.equal(defaults.limit, 5);
  assert.equal(defaults.country, "USA");
  assert.equal(
    parsePilotCliOptions(["--source", "university-study", "--country", "croatia", "--dry-run"]).country,
    "CROATIA",
  );
  for (const limit of ["0", "-1", "6", "1.5", "invalid"]) {
    assert.throws(
      () => parsePilotCliOptions(["--source", "university-study", "--limit", limit, "--dry-run"]),
      /integer from 1 to 5/,
    );
  }
});

test("requires an explicit enable flag for non-dry imports", () => {
  const live = parsePilotCliOptions(["--source", "university-study"]);
  assert.throws(() => assertImportEnabled(live, { UNIVERSITY_IMPORT_ENABLED: "false" }), /disabled/);
  assert.doesNotThrow(() => assertImportEnabled(live, { UNIVERSITY_IMPORT_ENABLED: "true" }));
  assert.doesNotThrow(() => assertImportEnabled({ ...live, dryRun: true }, {}));
});

test("rejects malformed source adapters", () => {
  const options = parsePilotCliOptions(["--source", "university-study", "--dry-run"]);
  assert.rejects(
    () => runUniversityPilot(options, { adapter: { sourceName: "university-study" } as UniversitySourceAdapter }),
    /missing discoverUniversityUrls/,
  );
});

test("dry-run performs no database writes", async () => {
  let databaseAccesses = 0;
  const database = new Proxy({}, { get() { databaseAccesses += 1; return undefined; } });
  const adapter: UniversitySourceAdapter = {
    sourceName: "university-study",
    async discoverUniversityUrls() { return ["https://fixture.invalid/example"]; },
    async extractUniversity(sourceUniversityUrl) {
      return { sourceUniversityUrl, name: "No Write University", city: "Austin", state: "Texas" };
    },
    normalizeUniversity: mapUniversityStudyUniversity,
    validateUniversity: validateNormalizedUniversity,
  };
  const summary = await runUniversityPilot(
    { source: "university-study", limit: 5, dryRun: true, fixture: null, country: "USA" },
    { adapter, database: database as never },
  );
  assert.equal(summary.importedCount, 1);
  assert.equal(databaseAccesses, 0);
});

test("continues after a 403 until the requested successful record count is reached", async () => {
  const attempted: string[] = [];
  let discoveryOptions: { country?: string | null; maxAttempts?: number } | undefined;
  const adapter: UniversitySourceAdapter = {
    sourceName: "university-study",
    async discoverUniversityUrls(options) {
      discoveryOptions = options;
      return ["https://blocked.example", "https://available.example"];
    },
    async extractUniversity(sourceUniversityUrl) {
      attempted.push(sourceUniversityUrl);
      if (sourceUniversityUrl.includes("blocked")) {
        throw new Error("Source access stopped with HTTP 403; no bypass was attempted.");
      }
      return { sourceUniversityUrl, name: "Available University", country: "USA", state: "TEXAS" };
    },
    normalizeUniversity: mapUniversityStudyUniversity,
    validateUniversity: validateNormalizedUniversity,
  };
  const summary = await runUniversityPilot(
    { source: "university-study", limit: 1, dryRun: true, fixture: null, country: "USA" },
    { adapter },
  );
  assert.deepEqual(attempted, ["https://blocked.example", "https://available.example"]);
  assert.equal(discoveryOptions?.country, "USA");
  assert.equal(discoveryOptions?.maxAttempts, 2);
  assert.equal(summary.failedCount, 1);
  assert.equal(summary.importedCount, 1);
});

test("enforces the Phase 1 maximum of two attempts per requested record", async () => {
  const attempted: string[] = [];
  const adapter: UniversitySourceAdapter = {
    sourceName: "university-study",
    async discoverUniversityUrls() {
      return Array.from({ length: 6 }, (_value, index) => `https://blocked-${index + 1}.example`);
    },
    async extractUniversity(sourceUniversityUrl) {
      attempted.push(sourceUniversityUrl);
      throw new Error("Source access stopped with HTTP 403; no bypass was attempted.");
    },
    normalizeUniversity: mapUniversityStudyUniversity,
    validateUniversity: validateNormalizedUniversity,
  };
  const summary = await runUniversityPilot(
    { source: "university-study", limit: 2, dryRun: true, fixture: null, country: "USA" },
    { adapter },
  );
  assert.equal(attempted.length, 4);
  assert.equal(summary.failedCount, 4);
  assert.equal(summary.importedCount, 0);
});
