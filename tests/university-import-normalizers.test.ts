import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanText,
  normalizeUniversityName,
  parseMoneyRange,
  safeUrl,
  slugify,
} from "../src/lib/university-import/normalizers";
import { deterministicDataHash } from "../src/lib/university-import/hashing";

test("normalizes names, whitespace, slugs, URLs, and money ranges", () => {
  assert.equal(cleanText("  Example \n University "), "Example University");
  assert.equal(normalizeUniversityName("The Example University"), "example");
  assert.equal(slugify("École & University"), "ecole-and-university");
  assert.equal(safeUrl("/scholarships", "https://example.edu/profile"), "https://example.edu/scholarships");
  assert.deepEqual(parseMoneyRange("USD 5,000 - 10,000"), {
    minimumAmount: 5000,
    maximumAmount: 10000,
    currency: "USD",
  });
});

test("produces deterministic hashes and ignores volatile extraction metadata", () => {
  const first = deterministicDataHash({ name: "Example", city: "Austin", extractedAt: "2026-01-01", requestId: "one" });
  const second = deterministicDataHash({ requestId: "two", extractedAt: "2026-07-01", city: "Austin", name: "Example" });
  assert.equal(first, second);
  assert.notEqual(first, deterministicDataHash({ name: "Example", city: "Dallas" }));
});

