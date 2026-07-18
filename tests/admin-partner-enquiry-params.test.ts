import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPartnerEnquiriesExportUrl,
  buildPartnerEnquiriesUrl,
  buildPartnerEnquirySearchWhere,
  parsePageParameter,
  sanitizeSearchParameter,
} from "../lib/admin-partner-enquiry-params";

test("parses partner enquiry pagination parameters", () => {
  assert.equal(parsePageParameter("1"), 1);
  assert.equal(parsePageParameter(" 24 "), 24);
  assert.equal(parsePageParameter(undefined), 1);
  assert.equal(parsePageParameter(["2", "3"]), 1);
  assert.equal(parsePageParameter(""), 1);
  assert.equal(parsePageParameter("0"), 1);
  assert.equal(parsePageParameter("-1"), 1);
  assert.equal(parsePageParameter("1.5"), 1);
  assert.equal(parsePageParameter("invalid"), 1);
  assert.equal(parsePageParameter("1000001"), 1);
});

test("sanitizes partner enquiry search parameters", () => {
  assert.equal(sanitizeSearchParameter("  Alpine   College  "), "Alpine College");
  assert.equal(sanitizeSearchParameter("   "), "");
  assert.equal(sanitizeSearchParameter(undefined), "");
  assert.equal(sanitizeSearchParameter(["Alpine", "College"]), "");
  assert.equal(sanitizeSearchParameter("a".repeat(120)).length, 100);
});

test("builds partner pagination URLs while preserving search", () => {
  assert.equal(
    buildPartnerEnquiriesUrl(2, ""),
    "/admin/partner-enquiries?page=2",
  );
  assert.equal(
    buildPartnerEnquiriesUrl(3, "Alpine College"),
    "/admin/partner-enquiries?page=3&q=Alpine+College",
  );
});

test("builds the partner export URL while preserving only search", () => {
  assert.equal(
    buildPartnerEnquiriesExportUrl(""),
    "/admin/partner-enquiries/export",
  );
  assert.equal(
    buildPartnerEnquiriesExportUrl("Alpine College"),
    "/admin/partner-enquiries/export?q=Alpine+College",
  );
});

test("builds the partner enquiry search predicate", () => {
  assert.deepEqual(buildPartnerEnquirySearchWhere("Alpine"), {
    OR: [
      { contactName: { contains: "Alpine" } },
      { organisation: { contains: "Alpine" } },
      { workEmail: { contains: "Alpine" } },
    ],
  });
  assert.deepEqual(buildPartnerEnquirySearchWhere(""), {});
});
