import assert from "node:assert/strict";
import test from "node:test";
import { mapScholarship } from "../src/lib/university-import/normalizers";

const sourceUrl = "https://partner.example/universities/example";

test("marks scholarships available only with positive evidence", () => {
  const mapped = mapScholarship({
    name: "Achievement Award",
    amountText: "USD 2,500 - USD 5,000",
    eligibilityText: "Minimum GPA 3.2",
    minimumGpa: "3.2",
  }, sourceUrl);
  assert.equal(mapped.scholarshipAvailable, "AVAILABLE");
  assert.equal(mapped.minimumAmount, 2500);
  assert.equal(mapped.maximumAmount, 5000);
  assert.equal(mapped.minimumGpa, 3.2);
});

test("uses UNKNOWN when a partner profile contains no scholarship evidence", () => {
  assert.equal(mapScholarship({}, sourceUrl).scholarshipAvailable, "UNKNOWN");
});

test("uses UNAVAILABLE only for an explicit authoritative statement", () => {
  assert.equal(mapScholarship({ explicitlyUnavailable: true }, sourceUrl).scholarshipAvailable, "UNAVAILABLE");
});

