import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAdminEmail,
  validateAdminPassword,
} from "../scripts/admin-credentials";

test("normalizes administrator email", () => {
  assert.equal(
    normalizeAdminEmail("  Administrator@Example.COM  "),
    "administrator@example.com",
  );
});

test("rejects malformed administrator email", () => {
  assert.throws(() => normalizeAdminEmail("not-an-email"));
});

test("accepts a password satisfying every policy requirement", () => {
  const password = "ValidPassword1!";
  assert.equal(validateAdminPassword(password), password);
});

test("rejects passwords shorter than 12 characters", () => {
  assert.throws(() => validateAdminPassword("Short1!a"));
});

test("rejects passwords missing a required character class", () => {
  assert.throws(() => validateAdminPassword("lowercase123!"));
  assert.throws(() => validateAdminPassword("UPPERCASE123!"));
  assert.throws(() => validateAdminPassword("NoNumbersHere!"));
  assert.throws(() => validateAdminPassword("NoSpecial1234"));
});
