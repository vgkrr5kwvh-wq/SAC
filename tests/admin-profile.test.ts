import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAdminAccountStatus,
  formatAdminProfileDate,
  unavailableProfileValue,
} from "../lib/admin-profile";

test("formats administrator account status", () => {
  assert.equal(formatAdminAccountStatus(true), "Active");
  assert.equal(formatAdminAccountStatus(false), "Inactive");
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
