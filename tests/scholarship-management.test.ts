import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasAdminPermission } from "../lib/admin-authorization";
import type { UniversityScholarshipManagementApiResponse } from "../lib/university-intelligence/api/scholarship-management.client";
import { buildScholarshipManagementApiUrl } from "../lib/university-intelligence/api/scholarship-management.client";
import { scholarshipManagementFilters } from "../app/admin/university-data/universities/[id]/scholarships/page";
import ScholarshipManagementView, { scholarshipAward } from "../app/admin/university-data/universities/[id]/scholarships/scholarship-management-view";
import { handleAdminUniversityScholarshipsRequest } from "../app/api/admin/universities/[id]/scholarships/route";

const activeFilters = { query: "Merit", availability: "AVAILABLE" as const, scholarshipType: "Merit", studyLevel: "Undergraduate", scope: "program-specific" as const, publicationStatus: "DRAFT" as const, verificationStatus: "OFFICIAL_VERIFIED" as const };

function scholarship(overrides: Partial<UniversityScholarshipManagementApiResponse["result"]["scholarships"][number]> = {}): UniversityScholarshipManagementApiResponse["result"]["scholarships"][number] {
  return { id: "scholarship-immutable-id", name: "Merit Award", programId: null, programName: null, scope: "university-wide", availability: "AVAILABLE", amountText: null, minimumAmount: 1000, maximumAmount: 3000, currency: "USD", scholarshipType: "Merit", studyLevel: "Undergraduate", deadlineText: "July 25, 2027", publicationStatus: "DRAFT", verificationStatus: "OFFICIAL_VERIFIED", updatedAt: "2026-07-25T00:00:00.000Z", ...overrides };
}

function response(scholarships = [scholarship(), scholarship({ id: "program-scholarship", programId: "program-id", programName: "Computer Science", scope: "program-specific", availability: "UNAVAILABLE", publicationStatus: "PUBLISHED" }), scholarship({ id: "unknown-shell", name: null, availability: "UNKNOWN", minimumAmount: 0, maximumAmount: 0, currency: null, scholarshipType: null, studyLevel: null, deadlineText: null })]): UniversityScholarshipManagementApiResponse {
  return { university: { id: "university-id", name: "Example University" }, result: { scholarships, statistics: { total: 3, published: 1, draft: 2, available: 1, unavailable: 1, unknown: 1, universityWide: 2, programSpecific: 1 }, options: { scholarshipTypes: ["Merit"], studyLevels: ["Undergraduate"] } } };
}

function render(data = response(), filters = {}) { return renderToStaticMarkup(React.createElement(ScholarshipManagementView, { data, filters })); }

test("lists draft and published scholarships with exact statistics and availability states", () => {
  const html = render();
  assert.match(html, /Merit Award/);
  for (const value of ["Total Scholarships", "Published", "Draft", "Available", "Unavailable", "Unknown", "University-wide", "Program-specific"]) assert.match(html, new RegExp(value));
  assert.match(html, /is-draft">Draft/);
  assert.match(html, /is-published">Published/);
  assert.match(html, /is-available">Available/);
  assert.match(html, /is-unavailable">Unavailable/);
  assert.match(html, /is-unknown">Unknown/);
  assert.match(html, /Showing 3 of 3 scholarships/);
});

test("preserves university-wide and program-specific scope semantics", () => {
  const html = render();
  assert.match(html, /is-university-wide">University-wide/);
  assert.match(html, /is-program-specific">Program-specific/);
  assert.match(html, /data-label="Program">University-wide/);
  assert.match(html, /data-label="Program">Computer Science/);
});

test("uses the scholarship draft fallback and never presents false zero amounts as an award", () => {
  const shell = scholarship({ name: null, amountText: null, minimumAmount: 0, maximumAmount: 0, currency: null });
  assert.equal(scholarshipAward(shell), "—");
  const html = render(response([shell]));
  assert.match(html, /Scholarship draft/);
  assert.doesNotMatch(html, /Unnamed scholarship record/);
  assert.doesNotMatch(html, />0–0</);
  assert.match(html, /data-label="Award" class="scholarship-table-placeholder">—/);
});

test("statistics cards preserve URL filters and replace their target filter", () => {
  const html = render(response(), activeFilters);
  assert.match(html, /href="[^\"]*q=Merit[^\"]*availability=AVAILABLE[^\"]*publicationStatus=PUBLISHED[^\"]*verificationStatus=OFFICIAL_VERIFIED[^\"]*"><span class="sr-only">Filter scholarships by Published/);
  assert.match(html, /href="[^\"]*availability=AVAILABLE[^\"]*scope=program-specific[^\"]*publicationStatus=DRAFT[^\"]*"><span class="sr-only">Filter scholarships by Available/);
  assert.match(html, /href="[^\"]*scope=university-wide[^\"]*"><span class="sr-only">Filter scholarships by University-wide/);
});

test("renders all filters, ignores blanks, and shows the empty state", () => {
  const html = render(response(), activeFilters);
  for (const name of ["q", "availability", "scholarshipType", "studyLevel", "scope", "publicationStatus", "verificationStatus"]) assert.match(html, new RegExp(`name="${name}"`));
  assert.deepEqual(scholarshipManagementFilters({ q: " Merit ", availability: "AVAILABLE", scholarshipType: " Merit ", studyLevel: " Undergraduate ", scope: "program-specific", publicationStatus: "DRAFT", verificationStatus: "OFFICIAL_VERIFIED" }), activeFilters);
  assert.ok(
    Object.values(
      scholarshipManagementFilters({ q: " ", availability: "INVALID", scope: "" }),
    ).every((value) => value === undefined),
  );
  assert.match(render(response([])), /No scholarships found\./);
});

test("uses immutable detail links and keeps public actions disabled", () => {
  const html = render(response([scholarship()]));
  assert.match(html, /href="\/admin\/university-data\/scholarships\/scholarship-immutable-id">Open Details/);
  assert.match(html, /aria-disabled="true" title="Public scholarship pages are not available">View Public/);
  assert.doesNotMatch(html, /href="[^"]+">View Public/);
});

test("sidebar no longer presents Scholarships as coming soon", () => {
  const navigation = readFileSync(new URL("../app/admin/admin-navigation.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(navigation, /\{ label: "Scholarships" \}/);
  for (const label of ["Admission Requirements", "Tuition", "Intakes"]) {
    assert.match(navigation, new RegExp(`\\{ label: "${label}" \\}`));
  }
});

test("builds the protected API URL and preserves permission behavior without a database", async () => {
  const url = buildScholarshipManagementApiUrl("https://example.test", "university-id", activeFilters);
  assert.equal(url.pathname, "/api/admin/universities/university-id/scholarships");
  assert.equal(url.searchParams.get("scope"), "program-specific");
  const service = { async listUniversityScholarships() { return null; } };
  assert.equal((await handleAdminUniversityScholarshipsRequest("missing-id", "allowed", {}, service)).status, 404);
  assert.equal((await handleAdminUniversityScholarshipsRequest("university-id", "forbidden", {}, service)).status, 403);
  assert.equal(hasAdminPermission("SUPER_ADMIN", "manage_university_data"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_university_data"), false);
});
