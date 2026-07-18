import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPartnerEnquiryDate,
  formatPartnerField,
  formatPartnerNotificationStatus,
  formatPartnerType,
  isValidPartnerEnquiryId,
  notProvidedPlaceholder,
} from "../lib/admin-partner-enquiry-detail";

test("validates partner enquiry cuid route parameters", () => {
  assert.equal(isValidPartnerEnquiryId("cm1234567890abcdefghijkl"), true);
  assert.equal(isValidPartnerEnquiryId(""), false);
  assert.equal(isValidPartnerEnquiryId(undefined), false);
  assert.equal(isValidPartnerEnquiryId(["cm1234567890abcdefghijkl"]), false);
  assert.equal(isValidPartnerEnquiryId(" cm1234567890abcdefghijkl "), false);
  assert.equal(isValidPartnerEnquiryId("../not-an-id"), false);
  assert.equal(isValidPartnerEnquiryId(`c${"a".repeat(30)}`), false);
});

test("formats partner fields and missing values", () => {
  assert.equal(formatPartnerField(undefined), notProvidedPlaceholder);
  assert.equal(formatPartnerField(null), notProvidedPlaceholder);
  assert.equal(formatPartnerField("   "), notProvidedPlaceholder);
  assert.equal(formatPartnerField("  Student recruitment  "), "Student recruitment");
  assert.equal(formatPartnerType("university"), "University");
  assert.equal(formatPartnerType("education_agent"), "Education agent");
  assert.equal(formatPartnerType(null), notProvidedPlaceholder);
});

test("formats partner submission fields for display", () => {
  assert.equal(formatPartnerNotificationStatus("PENDING"), "Pending");
  assert.equal(
    formatPartnerNotificationStatus("DELIVERY_FAILED"),
    "Delivery failed",
  );
  assert.equal(
    formatPartnerEnquiryDate(new Date("2026-07-18T10:47:00.000Z")),
    "18 July 2026\n4:32 PM NPT",
  );
  assert.equal(
    formatPartnerEnquiryDate(new Date(Number.NaN)),
    notProvidedPlaceholder,
  );
});
