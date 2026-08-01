import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasAdminPermission } from "../lib/admin-authorization";
import type { UniversityProgramManagementApiResponse } from "../lib/university-intelligence/api/program-management.client";
import { buildProgramManagementApiUrl } from "../lib/university-intelligence/api/program-management.client";
import { programManagementFilters } from "../app/admin/university-data/universities/[id]/programs/page";
import ProgramManagementView from "../app/admin/university-data/universities/[id]/programs/program-management-view";
import { handleAdminUniversityProgramsRequest } from "../app/api/admin/universities/[id]/programs/route";

const filters = { query: "Computer", degreeLevel: "Bachelor", campus: "Main", intake: "Fall", publicationStatus: "DRAFT" as const };

function response(programs: UniversityProgramManagementApiResponse["result"]["programs"] = [{
  id: "program-immutable-id",
  name: "Computer Science",
  degreeLevel: "Bachelor",
  studyLevel: "Undergraduate",
  department: "Computing",
  campus: "Main",
  durationText: "4 years",
  startingTuition: 32000,
  tuitionCurrency: "USD",
  intakeCount: 2,
  publicationStatus: "DRAFT",
  verificationStatus: "OFFICIAL_VERIFIED",
  updatedAt: "2026-07-25T00:00:00.000Z",
}]): UniversityProgramManagementApiResponse {
  return {
    university: { id: "university-id", name: "Example University" },
    result: {
      programs,
      statistics: { total: 9, published: 5, draft: 4, undergraduate: 6, graduate: 3 },
      options: { degreeLevels: ["Bachelor"], campuses: ["Main"], intakes: ["Fall"] },
    },
  };
}

function render(data = response(), activeFilters = {}) {
  return renderToStaticMarkup(React.createElement(ProgramManagementView, { data, filters: activeFilters }));
}

test("lists draft programs with statistics, stored-currency tuition, and intake count", () => {
  const html = render();
  assert.match(html, /Computer Science/);
  assert.match(html, /Draft/);
  assert.match(html, /\$32,000/);
  assert.match(html, /data-label="Intakes"><span class="program-management-intakes"><strong>2<\/strong><small>2 intakes<\/small>/);
  for (const value of ["Total Programs", "9", "Published", "5", "Draft", "4", "Undergraduate", "6", "Graduate", "3"]) assert.match(html, new RegExp(value));
});

test("renders empty and missing-field states safely", () => {
  assert.match(render(response([])), /No programs found\./);
  const missing = response([{ ...response().result.programs[0], degreeLevel: null, studyLevel: null, department: null, campus: null, durationText: null, startingTuition: null, tuitionCurrency: null, intakeCount: 0 }]);
  const html = render(missing);
  assert.match(html, /program-management-placeholder">—/);
  assert.match(html, /<strong>0<\/strong><small>No intakes<\/small>/);
  assert.doesNotMatch(html, /Not provided/);
});

test("polishes degree, title, summary, and persistent actions presentation", () => {
  const longName = "A very long computer science program title that remains fully available";
  const html = render(response([{ ...response().result.programs[0], name: longName }]));
  assert.match(html, /class="program-management-degree">Undergraduate/);
  assert.match(html, new RegExp(`class="program-management-title" title="${longName}"`));
  assert.match(html, /Showing 1 of 9 programs/);
  assert.match(html, /class="program-management-actions"/);
});

test("renders filters and normalizes supported filter parameters", () => {
  const html = render(response(), filters);
  for (const name of ["q", "degreeLevel", "campus", "intake", "publicationStatus"]) assert.match(html, new RegExp(`name="${name}"`));
  assert.match(html, /Reset Filters/);
  assert.deepEqual(programManagementFilters({ q: " Computer ", degreeLevel: " Bachelor ", campus: " Main ", intake: " Fall ", publicationStatus: "DRAFT" }), filters);
  assert.equal(programManagementFilters({ publicationStatus: "INVALID" }).publicationStatus, undefined);
});

test("uses immutable detail links and keeps public program actions disabled", () => {
  const html = render();
  assert.match(html, /href="\/admin\/university-data\/programs\/program-immutable-id">Open Details/);
  assert.match(html, /aria-disabled="true" title="Public program pages are not available">View Public/);
  assert.doesNotMatch(html, /href="[^"]+">View Public/);
});

test("builds the protected API URL and preserves permission behavior without a database", async () => {
  const url = buildProgramManagementApiUrl("https://example.test", "university-id", filters);
  assert.equal(url.pathname, "/api/admin/universities/university-id/programs");
  assert.equal(url.searchParams.get("publicationStatus"), "DRAFT");
  const service = { async listUniversityPrograms() { return null; } };
  assert.equal((await handleAdminUniversityProgramsRequest("missing-id", "allowed", {}, service)).status, 404);
  assert.equal((await handleAdminUniversityProgramsRequest("university-id", "forbidden", {}, service)).status, 403);
  assert.equal(hasAdminPermission("SUPER_ADMIN", "manage_university_data"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_university_data"), false);
});
