import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEnquiriesExportUrl,
  buildEnquirySearchWhere,
  buildEnquiriesUrl,
  parsePageParameter,
  sanitizeSearchParameter,
} from "../lib/admin-enquiry-params";

test("parses positive pagination parameters", () => {
  assert.equal(parsePageParameter("1"), 1);
  assert.equal(parsePageParameter(" 42 "), 42);
});

test("falls back to page one for unsafe pagination values", () => {
  assert.equal(parsePageParameter(undefined), 1);
  assert.equal(parsePageParameter(["2", "3"]), 1);
  assert.equal(parsePageParameter(""), 1);
  assert.equal(parsePageParameter("   "), 1);
  assert.equal(parsePageParameter("0"), 1);
  assert.equal(parsePageParameter("-2"), 1);
  assert.equal(parsePageParameter("1.5"), 1);
  assert.equal(parsePageParameter("not-a-page"), 1);
  assert.equal(parsePageParameter("1000001"), 1);
  assert.equal(parsePageParameter("9".repeat(100)), 1);
});

test("sanitizes and bounds search parameters", () => {
  assert.equal(sanitizeSearchParameter("  Jane   Doe  "), "Jane Doe");
  assert.equal(sanitizeSearchParameter(undefined), "");
  assert.equal(sanitizeSearchParameter(["Jane", "Doe"]), "");
  assert.equal(sanitizeSearchParameter("a".repeat(120)).length, 100);
});

test("builds pagination URLs while preserving search", () => {
  assert.equal(buildEnquiriesUrl(2, ""), "/admin/enquiries?page=2");
  assert.equal(
    buildEnquiriesUrl(3, "Jane Doe"),
    "/admin/enquiries?page=3&q=Jane+Doe",
  );
});

test("builds the student export URL while preserving only search", () => {
  assert.equal(buildEnquiriesExportUrl(""), "/admin/enquiries/export");
  assert.equal(
    buildEnquiriesExportUrl("Jane Doe"),
    "/admin/enquiries/export?q=Jane+Doe",
  );
});

test("builds a field-limited student enquiry search predicate", () => {
  assert.deepEqual(buildEnquirySearchWhere("Nepal"), {
    OR: [
      { name: { contains: "Nepal" } },
      { email: { contains: "Nepal" } },
      { interest: { contains: "Nepal" } },
    ],
  });
  assert.deepEqual(buildEnquirySearchWhere(""), {});
});
