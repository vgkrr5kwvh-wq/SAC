import assert from "node:assert/strict";
import test from "node:test";
import {
  ingestUniversityCatalog,
  normalizeRawUniversityCatalog,
  supportedCatalogSchemaVersions,
} from "../lib/student-hub/universities";
import { program, university } from "./fixtures/university-catalog";

const referenceDate = new Date("2026-07-24T00:00:00Z");

test("successful ingestion returns normalized validated data and complete metadata", () => {
  const raw = {
    schemaVersion: 1,
    universities: [{
      ...university,
      slug: " Production University ",
      name: "  Production   University ",
      country: "ca",
      website: "https://EXAMPLE.edu/",
      programs: [{
        ...program,
        slug: " Master Computer Science ",
        name: " Master   of Computer Science ",
        subjectAliases: ["Computing", " computing ", "Computer Science"],
        tuition: { ...program.tuition!, currency: "cad" },
      }],
    }],
  };
  const result = ingestUniversityCatalog(raw, { referenceDate });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.catalog[0].slug, "production-university");
  assert.equal(result.catalog[0].name, "Production University");
  assert.equal(result.catalog[0].country, "CA");
  assert.equal(result.catalog[0].programs[0].slug, "master-computer-science");
  assert.deepEqual(result.catalog[0].programs[0].subjectAliases, ["Computing", "Computer Science"]);
  assert.equal(result.catalog[0].programs[0].tuition?.currency, "CAD");
  assert.ok(result.warnings.some((issue) => issue.code === "normalization-warning"));
  assert.deepEqual(result.metadata, {
    schemaVersion: 1,
    universityCount: 1,
    programCount: 1,
    activeProgramCount: 1,
    sampleRecordCount: 0,
    verifiedRecordCount: 2,
    staleRecordCount: 0,
    unverifiedRecordCount: 0,
    ingestedAt: referenceDate.toISOString(),
  });
});

test("normalization does not infer policy or requirement values", () => {
  const raw = {
    schemaVersion: 1,
    universities: [{
      ...university,
      programs: [{
        ...program,
        academicRequirements: [],
        englishRequirements: [],
        tuition: null,
        intakes: [],
        scholarship: { ...program.scholarship, state: "unknown" },
        locationClassification: "unknown",
        previousQualificationRequirements: [],
      }],
    }],
  };
  const normalized = normalizeRawUniversityCatalog(raw).value as typeof raw;
  const candidate = normalized.universities[0].programs[0];
  assert.deepEqual(candidate.academicRequirements, []);
  assert.deepEqual(candidate.englishRequirements, []);
  assert.equal(candidate.tuition, null);
  assert.deepEqual(candidate.intakes, []);
  assert.equal(candidate.scholarship.state, "unknown");
  assert.equal(candidate.locationClassification, "unknown");
  assert.deepEqual(candidate.previousQualificationRequirements, []);
});

test("unknown and malformed input returns structured schema errors", () => {
  for (const raw of [null, "catalog", {}, { schemaVersion: 1, universities: "invalid" }]) {
    const result = ingestUniversityCatalog(raw, { referenceDate });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(result.errors.length > 0);
      assert.ok(result.errors.every((issue) => issue.code === "schema-validation"));
      assert.ok(result.errors.every((issue) => !("issues" in issue)));
    }
  }
});

test("unsupported schema versions fail without speculative migration", () => {
  assert.deepEqual(supportedCatalogSchemaVersions, [1]);
  const result = ingestUniversityCatalog({ schemaVersion: 2, universities: [] }, { referenceDate });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.errors[0].code, "unsupported-value");
    assert.deepEqual(result.errors[0].path, ["schemaVersion"]);
  }
});

test("schema failures map verification context without exposing Zod errors", () => {
  const result = ingestUniversityCatalog({
    schemaVersion: 1,
    universities: [{
      ...university,
      verification: { ...university.verification, sourceUrl: "not-a-url" },
    }],
  }, { referenceDate });
  assert.equal(result.success, false);
  if (!result.success) {
    const issue = result.errors[0];
    assert.equal(issue.code, "invalid-verification-metadata");
    assert.equal(issue.universitySlug, university.slug);
    assert.match(issue.suggestedRemediation ?? "", /verification/i);
  }
});

test("invariant failures are returned atomically with stable duplicate codes", () => {
  const result = ingestUniversityCatalog({
    schemaVersion: 1,
    universities: [
      university,
      { ...university, name: "Duplicate University" },
    ],
  }, { referenceDate });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.errors.some((issue) => issue.code === "duplicate-identifier"));
    assert.ok(result.errors.every((issue) => issue.severity === "error"));
    assert.equal(result.metadata.universityCount, 0);
  }
});
