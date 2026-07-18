import assert from "node:assert/strict";
import test from "node:test";
import {
  formatEnquiryDate,
  formatNotificationStatus,
  formatPhone,
  formatStudyDestination,
  isValidEnquiryId,
  notCapturedPlaceholder,
  notSpecifiedPlaceholder,
} from "../lib/admin-enquiry-detail";

test("validates enquiry cuid route parameters", () => {
  assert.equal(isValidEnquiryId("cm1234567890abcdefghijkl"), true);
  assert.equal(isValidEnquiryId(""), false);
  assert.equal(isValidEnquiryId(undefined), false);
  assert.equal(isValidEnquiryId(["cm1234567890abcdefghijkl"]), false);
  assert.equal(isValidEnquiryId(" cm1234567890abcdefghijkl "), false);
  assert.equal(isValidEnquiryId("../not-an-id"), false);
  assert.equal(isValidEnquiryId("C123456789012345678901234"), false);
  assert.equal(isValidEnquiryId(`c${"a".repeat(30)}`), false);
});

test("formats unavailable phone and destination fields", () => {
  assert.equal(formatPhone(undefined), notCapturedPlaceholder);
  assert.equal(formatPhone(null), notCapturedPlaceholder);
  assert.equal(formatPhone("   "), notCapturedPlaceholder);
  assert.equal(formatPhone("+977 00 000 0000"), "+977 00 000 0000");
  assert.equal(formatStudyDestination(null), notSpecifiedPlaceholder);
  assert.equal(formatStudyDestination("  Canada  "), "Canada");
});

test("formats submission fields for display", () => {
  assert.equal(formatNotificationStatus("PENDING"), "Pending");
  assert.equal(formatNotificationStatus("DELIVERY_FAILED"), "Delivery failed");
  assert.equal(
    formatEnquiryDate(new Date("2026-07-18T00:00:00.000Z")),
    "18 Jul 2026, 05:45",
  );
  assert.equal(formatEnquiryDate(new Date(Number.NaN)), notSpecifiedPlaceholder);
});
