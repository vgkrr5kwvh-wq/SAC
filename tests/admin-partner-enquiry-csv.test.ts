import assert from "node:assert/strict";
import test from "node:test";
import { csvBom, limitExportRecords } from "../lib/admin-enquiry-csv";
import {
  buildPartnerEnquiriesCsv,
  buildPartnerExportFilename,
  partnerEnquiryCsvHeaders,
} from "../lib/admin-partner-enquiry-csv";

test("uses the required partner CSV header order", () => {
  assert.deepEqual(partnerEnquiryCsvHeaders, [
    "Partner Type",
    "Contact Name",
    "Work Email",
    "Organisation",
    "Country / Locations",
    "Partnership Proposal",
    "Details",
    "Additional Details",
    "Notification Status",
    "Submitted Date",
  ]);
});

test("builds a BOM-prefixed header-only partner CSV", () => {
  const csv = buildPartnerEnquiriesCsv([]);
  assert.equal(csv.startsWith(csvBom), true);
  assert.equal(csv.slice(csvBom.length).split("\r\n").filter(Boolean).length, 1);
});

test("maps and safely escapes every partner export field", () => {
  const csv = buildPartnerEnquiriesCsv([
    {
      partnerType: "university",
      contactName: "=Contact",
      workEmail: "  +email@example.test",
      organisation: 'Example, "University"',
      locations: "नेपाल\nKathmandu",
      partnershipProposal: "-Proposal",
      details: "@Details",
      additionalDetails: null,
      notificationStatus: "PENDING",
      createdAt: new Date("2026-07-18T10:47:00.000Z"),
    },
  ]);

  assert.match(csv, /"University"/u);
  assert.match(csv, /"'=Contact"/u);
  assert.match(csv, /"'  \+email@example\.test"/u);
  assert.match(csv, /"Example, ""University"""/u);
  assert.match(csv, /"नेपाल\nKathmandu"/u);
  assert.match(csv, /"'-Proposal"/u);
  assert.match(csv, /"'@Details"/u);
  assert.match(csv, /"Not provided"/u);
  assert.match(csv, /"Pending"/u);
  assert.match(csv, /"18 July 2026 4:32 PM NPT"/u);
});

test("formats partner filenames using the Nepal date", () => {
  assert.equal(
    buildPartnerExportFilename(new Date("2026-07-17T18:30:00.000Z")),
    "partner-enquiries-2026-07-18.csv",
  );
});

test("caps export records and reports truncation", () => {
  assert.deepEqual(limitExportRecords([1, 2], 2), {
    records: [1, 2],
    truncated: false,
  });
  assert.deepEqual(limitExportRecords([1, 2, 3], 2), {
    records: [1, 2],
    truncated: true,
  });
});
