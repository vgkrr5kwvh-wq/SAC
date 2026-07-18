import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidAdminPassword,
  parsePasswordChange,
} from "../lib/admin-password-change";

test("accepts an administrator password satisfying the policy", () => {
  assert.equal(isValidAdminPassword("SecurePassword1!"), true);
});

test("rejects passwords missing a policy requirement", () => {
  assert.equal(isValidAdminPassword("Short1!a"), false);
  assert.equal(isValidAdminPassword("lowercase123!"), false);
  assert.equal(isValidAdminPassword("UPPERCASE123!"), false);
  assert.equal(isValidAdminPassword("NoNumbersHere!"), false);
  assert.equal(isValidAdminPassword("NoSpecial1234"), false);
});

test("validates matching password-change fields", () => {
  assert.deepEqual(
    parsePasswordChange({
      currentPassword: "CurrentPassword1!",
      newPassword: "ReplacementPassword2@",
      confirmPassword: "ReplacementPassword2@",
    }),
    {
      currentPassword: "CurrentPassword1!",
      newPassword: "ReplacementPassword2@",
      confirmPassword: "ReplacementPassword2@",
    },
  );
});

test("rejects mismatched confirmation and malformed input", () => {
  assert.equal(
    parsePasswordChange({
      currentPassword: "CurrentPassword1!",
      newPassword: "ReplacementPassword2@",
      confirmPassword: "DifferentPassword3#",
    }),
    null,
  );
  assert.equal(parsePasswordChange({}), null);
  assert.equal(parsePasswordChange(null), null);
});
