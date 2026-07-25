import assert from "node:assert/strict";
import test from "node:test";
import { claimNumber } from "../app/admin/university-data/materialization-values";

test("numeric claim materialization preserves missing values as null", () => {
  assert.equal(claimNumber(null), null);
  assert.equal(claimNumber(undefined), null);
  assert.equal(claimNumber(""), null);
  assert.equal(claimNumber("   "), null);
  assert.equal(claimNumber("not-a-number"), null);
});

test("numeric claim materialization accepts explicit valid numbers", () => {
  assert.equal(claimNumber(42), 42);
  assert.equal(claimNumber("42.5"), 42.5);
  assert.equal(claimNumber(0), 0);
  assert.equal(claimNumber("0"), 0);
});

test("numeric claim materialization rejects non-finite and non-numeric values", () => {
  assert.equal(claimNumber(Number.NaN), null);
  assert.equal(claimNumber(Number.POSITIVE_INFINITY), null);
  assert.equal(claimNumber(true), null);
  assert.equal(claimNumber({ amount: 100 }), null);
});
