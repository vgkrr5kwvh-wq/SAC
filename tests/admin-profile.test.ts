import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAdminAccountStatus,
  formatAdminProfileDate,
  formatAuthenticationStatus,
  formatSessionExpiry,
  unavailableProfileValue,
} from "../lib/admin-profile";

test("formats administrator account status", () => {
  assert.equal(formatAdminAccountStatus(true), "Active");
  assert.equal(formatAdminAccountStatus(false), "Inactive");
});

test("formats authentication status without exposing session details", () => {
  assert.equal(formatAuthenticationStatus(true), "Authenticated");
  assert.equal(formatAuthenticationStatus(false), "Not authenticated");
});

test("formats administrator dates in Nepal Time", () => {
  assert.equal(
    formatAdminProfileDate(new Date("2026-07-18T10:47:00.000Z")),
    "18 July 2026\n4:32 PM NPT",
  );
  assert.equal(
    formatAdminProfileDate(new Date(Number.NaN)),
    unavailableProfileValue,
  );
});

test("formats session expiry only when it is available", () => {
  assert.equal(
    formatSessionExpiry("2026-07-18T10:47:00.000Z"),
    "18 July 2026\n4:32 PM NPT",
  );
  assert.equal(formatSessionExpiry(undefined), "Managed by secure JWT session");
  assert.equal(formatSessionExpiry("invalid"), "Managed by secure JWT session");
});
