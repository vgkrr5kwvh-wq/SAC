import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCatalogFreshness,
  getVerificationFreshness,
  isVerificationStale,
} from "../lib/student-hub/universities";
import type { VerificationMetadata } from "../lib/student-hub/universities";
import { verifiedMetadata, withProgram, withUniversity } from "./fixtures/university-catalog";

const referenceDate = new Date("2026-07-24T12:00:00Z");

function verification(overrides: Partial<VerificationMetadata>): VerificationMetadata {
  return { ...verifiedMetadata, ...overrides };
}

test("verified freshness is current at the boundary and stale one day later", () => {
  const boundary = verification({ lastReviewedAt: "2025-07-24" });
  const expired = verification({ lastReviewedAt: "2025-07-23" });
  assert.deepEqual(getVerificationFreshness(boundary, referenceDate), {
    status: "current", ageDays: 365, maxAgeDays: 365,
  });
  assert.equal(getVerificationFreshness(expired, referenceDate).status, "stale");
  assert.equal(isVerificationStale(expired, referenceDate), true);
});

test("partially verified records use the shorter injected policy interval", () => {
  const partial = verification({
    verificationStatus: "partially-verified",
    lastReviewedAt: "2026-01-25",
  });
  assert.equal(getVerificationFreshness(partial, referenceDate).status, "current");
  assert.equal(getVerificationFreshness(
    partial,
    referenceDate,
    { verifiedMaxAgeDays: 30, partiallyVerifiedMaxAgeDays: 10 },
  ).status, "stale");
});

test("missing review dates warn but do not remove records", () => {
  const missing = verification({ lastReviewedAt: null });
  const candidate = withUniversity({
    verification: missing,
    programs: [withProgram({ verification: missing })],
  });
  const assessment = assessCatalogFreshness([candidate], referenceDate);
  assert.equal(assessment.staleRecordCount, 2);
  assert.equal(assessment.warnings.length, 2);
  assert.ok(assessment.warnings.every((issue) => issue.code === "invalid-verification-metadata"));
});

test("sample and unverified records are never counted as current verified data", () => {
  const unverified = verification({
    verificationStatus: "unverified",
    sourceType: "sample",
    lastReviewedAt: null,
    sourceUrl: null,
  });
  assert.deepEqual(getVerificationFreshness(unverified, referenceDate), {
    status: "unverified", ageDays: null, maxAgeDays: null,
  });
  const assessment = assessCatalogFreshness([
    withUniversity({
      sampleRecord: true,
      verification: unverified,
      programs: [withProgram({ verification: unverified })],
    }),
  ], referenceDate);
  assert.equal(assessment.verifiedRecordCount, 0);
  assert.equal(assessment.unverifiedRecordCount, 2);
  assert.equal(assessment.staleRecordCount, 0);
});

test("freshness uses only the injected reference date", () => {
  const metadata = verification({ lastReviewedAt: "2026-01-01" });
  assert.equal(getVerificationFreshness(metadata, new Date("2026-01-02T23:59:59Z")).status, "current");
  assert.equal(getVerificationFreshness(metadata, new Date("2028-01-02T00:00:00Z")).status, "stale");
});
