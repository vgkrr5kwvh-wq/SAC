import assert from "node:assert/strict";
import test from "node:test";
import {
  CatalogIngestionError,
  createLocalUniversityCatalogRepository,
  localUniversityCatalogRepository,
} from "../lib/student-hub/universities";
import { rawSampleUniversityCatalog } from "../lib/student-hub/universities/data";

const referenceDate = new Date("2026-07-24T00:00:00Z");

test("local repository exposes only validated active records by default", async () => {
  const catalog = await localUniversityCatalogRepository.getCatalog();
  assert.equal(catalog.length, 2);
  assert.ok(catalog.every((university) => university.active));
  assert.ok(catalog.flatMap((university) => university.programs).every((program) => program.active));
  assert.equal((await localUniversityCatalogRepository.getCatalog({ includeInactive: true })).length, 3);
});

test("inactive programs are hidden unless explicitly requested", async () => {
  const raw = structuredClone(rawSampleUniversityCatalog) as unknown as {
    schemaVersion: number;
    universities: Array<{ programs: Array<{ active: boolean }> }>;
  };
  raw.universities[0].programs[0].active = false;
  const repository = createLocalUniversityCatalogRepository({ rawCatalog: raw, referenceDate });
  assert.equal((await repository.getUniversityBySlug("sample-northstar-university"))?.programs.length, 1);
  assert.equal((await repository.getUniversityBySlug("sample-northstar-university", { includeInactive: true }))?.programs.length, 2);
});

test("local repository validates once and caches the immutable result", async () => {
  const raw = structuredClone(rawSampleUniversityCatalog) as unknown as {
    schemaVersion: number;
    universities: unknown[];
  };
  const repository = createLocalUniversityCatalogRepository({ rawCatalog: raw, referenceDate });
  const first = await repository.getCatalog({ includeInactive: true });
  raw.universities.length = 0;
  const second = await repository.getCatalog({ includeInactive: true });
  assert.deepEqual(second, first);
  assert.equal(second.length, 3);
  assert.equal(Object.isFrozen(second), true);
  assert.equal(Object.isFrozen(second[0]), true);
  assert.throws(() => {
    (second as unknown as { pop: () => unknown }).pop();
  }, TypeError);
});

test("invalid raw catalogs never become repository data", async () => {
  const repository = createLocalUniversityCatalogRepository({
    rawCatalog: { schemaVersion: 1, universities: [{ invalid: true }] },
    referenceDate,
  });
  await assert.rejects(repository.getCatalog(), (error: unknown) =>
    error instanceof CatalogIngestionError
    && error.issues.some((issue) => issue.code === "schema-validation")
  );
});

test("repository queries are deterministic and filter inactive records", async () => {
  const repository = createLocalUniversityCatalogRepository({ referenceDate });
  const first = await repository.getActivePrograms();
  const second = await repository.getActivePrograms();
  assert.deepEqual(first, second);
  assert.deepEqual(first.map((entry) => entry.university.name), [
    "Sample Maple Coast College",
    "Sample Maple Coast College",
    "Sample Northstar University",
    "Sample Northstar University",
  ]);
});

test("repository supports country, study-level, exact subject, slug, and featured queries", async () => {
  const repository = createLocalUniversityCatalogRepository({ referenceDate });
  assert.equal((await repository.getProgramsByCountry("CA")).length, 2);
  assert.equal((await repository.getProgramsByStudyLevel("bachelor")).length, 2);
  assert.equal((await repository.getProgramsBySubject(" Computer Science ")).length, 1);
  assert.equal((await repository.getProgramsBySubject("computing")).length, 1);
  assert.equal((await repository.getProgramsBySubject("computer")).length, 0);
  assert.equal((await repository.getUniversityBySlug(" SAMPLE-NORTHSTAR-UNIVERSITY "))?.name, "Sample Northstar University");
  assert.deepEqual((await repository.getFeaturedUniversities()).map((candidate) => candidate.name), ["Sample Northstar University"]);
});

test("repository metadata comes from successful ingestion", async () => {
  const repository = createLocalUniversityCatalogRepository({ referenceDate });
  const metadata = await repository.getIngestionMetadata();
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.universityCount, 3);
  assert.equal(metadata.programCount, 5);
  assert.equal(metadata.activeProgramCount, 4);
  assert.equal(metadata.sampleRecordCount, 3);
});
