import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStudentEnquiriesCsv,
  buildStudentExportFilename,
  csvBom,
  escapeCsvCell,
  protectCsvFormula,
} from "../lib/admin-enquiry-csv";

test("escapes commas, quotes, and embedded line breaks", () => {
  assert.equal(escapeCsvCell("Kathmandu, Nepal"), '"Kathmandu, Nepal"');
  assert.equal(escapeCsvCell('She said "hello"'), '"She said ""hello"""');
  assert.equal(escapeCsvCell("First line\nSecond line"), '"First line\nSecond line"');
});

test("preserves Unicode and Nepali text", () => {
  assert.equal(escapeCsvCell("नमस्ते नेपाल"), '"नमस्ते नेपाल"');
});

test("protects spreadsheet formulas including leading whitespace", () => {
  for (const value of ["=SUM(A1:A2)", "+1", "-1", "@value", "  =formula"]) {
    assert.equal(protectCsvFormula(value), `'${value}`);
  }
  assert.equal(protectCsvFormula("Safe value"), "Safe value");
});

test("normalizes null CSV values to clear placeholders", () => {
  assert.equal(escapeCsvCell(null), '"Not provided"');
  assert.equal(escapeCsvCell(undefined, "Not specified"), '"Not specified"');
});

test("builds a BOM-prefixed header-only CSV for empty results", () => {
  const csv = buildStudentEnquiriesCsv([]);
  assert.equal(csv.startsWith(csvBom), true);
  assert.equal(csv.slice(csvBom.length).split("\r\n").filter(Boolean).length, 1);
  assert.match(csv, /^\uFEFF"Full Name","Email","Study Destination"/u);
});

test("maps enquiry fields with placeholders, safety, and Nepal time", () => {
  const csv = buildStudentEnquiriesCsv([
    {
      name: "Example Student",
      email: "student@example.test",
      interest: null,
      message: "=unsafe formula",
      notificationStatus: "PENDING",
      createdAt: new Date("2026-07-18T10:47:00.000Z"),
    },
  ]);

  assert.match(csv, /"Not specified"/u);
  assert.match(csv, /"'=unsafe formula"/u);
  assert.match(csv, /"Pending"/u);
  assert.match(csv, /"18 July 2026 4:32 PM NPT"/u);
});

test("formats the export filename using the current Nepal date", () => {
  assert.equal(
    buildStudentExportFilename(new Date("2026-07-17T18:30:00.000Z")),
    "student-enquiries-2026-07-18.csv",
  );
});
