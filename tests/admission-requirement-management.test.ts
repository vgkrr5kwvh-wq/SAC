import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasAdminPermission } from "../lib/admin-authorization";
import type { UniversityAdmissionRequirementManagementApiResponse } from "../lib/university-intelligence/api/admission-requirement-management.client";
import { buildAdmissionRequirementManagementApiUrl } from "../lib/university-intelligence/api/admission-requirement-management.client";
import { admissionRequirementManagementFilters } from "../app/admin/university-data/universities/[id]/requirements/page";
import AdmissionRequirementManagementView, { accepted, required } from "../app/admin/university-data/universities/[id]/requirements/requirement-management-view";
import { handleAdminUniversityRequirementsRequest } from "../app/api/admin/universities/[id]/requirements/route";
import { universityRequirementsHref } from "../app/admin/admin-navigation";

const filters = { query: "Engineering", studyLevel: "Graduate", degreeLevel: "Masters", programId: "program-1", publicationStatus: "DRAFT" as const, verificationStatus: "DISCOVERED" as const, scope: "program-specific" as const };

function requirement(overrides: Partial<UniversityAdmissionRequirementManagementApiResponse["result"]["requirements"][number]> = {}): UniversityAdmissionRequirementManagementApiResponse["result"]["requirements"][number] {
  return { id: "requirement-immutable-id", programId: null, programName: null, scope: "university-wide", studyLevel: "Undergraduate", degreeLevel: null, ieltsOverall: 6.5, toeflOverall: null, pteOverall: 58, duolingoOverall: null, minimumGpa: 3, moiAccepted: null, backlogsAccepted: false, statementOfPurposeRequired: true, recommendationLetters: 2, resumeRequired: true, passportRequired: null, interviewRequired: false, publicationStatus: "DRAFT", verificationStatus: "DISCOVERED", updatedAt: "2026-07-25T00:00:00.000Z", ...overrides };
}

function response(requirements = [requirement(), requirement({ id: "program-requirement", programId: "program-1", programName: "Engineering", scope: "program-specific", degreeLevel: "Masters", publicationStatus: "PUBLISHED", verificationStatus: "OFFICIAL_VERIFIED" })]): UniversityAdmissionRequirementManagementApiResponse {
  return { university: { id: "university-id", name: "Example University" }, result: { requirements, statistics: { total: 2, published: 1, draft: 1, officiallyVerified: 1, universityWide: 1, programSpecific: 1 }, options: { studyLevels: ["Graduate", "Undergraduate"], degreeLevels: ["Masters"], programs: [{ id: "program-1", name: "Engineering" }] } } };
}

function render(data = response(), active = {}) { return renderToStaticMarkup(React.createElement(AdmissionRequirementManagementView, { data, filters: active })); }

test("lists university-wide, program-specific, published, and draft requirements", () => {
  const html = render();
  assert.match(html, /Admission Requirements/);
  assert.match(html, /University-wide/);
  assert.match(html, /Engineering/);
  assert.match(html, /is-draft">Draft/);
  assert.match(html, /is-published">Published/);
  for (const text of ["Total Requirements", "Officially Verified", "Showing 2 of 2 requirements"]) assert.match(html, new RegExp(text));
});

test("renders missing and boolean values without leaking raw primitives", () => {
  assert.equal(required(true), "Required");
  assert.equal(required(false), "Optional");
  assert.equal(required(null), "—");
  assert.equal(accepted(true), "Accepted");
  assert.equal(accepted(false), "Not Accepted");
  const html = render(response([requirement()]));
  assert.match(html, /data-label="TOEFL" class="requirement-placeholder">—/);
  assert.match(html, /data-label="SOP">Required/);
  assert.match(html, /data-label="Backlogs">Not Accepted/);
  assert.match(html, /data-label="Interview">Optional/);
  assert.doesNotMatch(html, />null<|>undefined<|>false<|>0</);
});

test("normalizes URL filters and statistics preserve them", () => {
  assert.deepEqual(admissionRequirementManagementFilters({ q: " Engineering ", studyLevel: "Graduate", degreeLevel: "Masters", programId: "program-1", publicationStatus: "DRAFT", verificationStatus: "DISCOVERED", scope: "program-specific" }), filters);
  const html = render(response(), filters);
  assert.match(html, /href="[^\"]*q=Engineering[^\"]*publicationStatus=PUBLISHED[^\"]*scope=program-specific[^\"]*"><span class="sr-only">Filter requirements by Published/);
  assert.match(html, /href="[^\"]*verificationStatus=OFFICIAL_VERIFIED[^\"]*"><span class="sr-only">Filter requirements by Officially Verified/);
  assert.match(html, /class="is-active"><dt>Draft<\/dt>[\s\S]*aria-current="page"/);
});

test("renders empty state and immutable read-only actions", () => {
  const empty = render(response([]));
  assert.match(empty, /No admission requirements found/);
  assert.match(empty, /No admission requirements have been imported or reviewed for this university yet\./);
  assert.match(empty, /Run enrichment or import reviewed admission requirements to populate this section\./);
  const html = render(response([requirement()]));
  assert.match(html, /href="\/admin\/university-data\/requirements\/requirement-immutable-id">Open Details/);
  assert.match(html, /aria-disabled="true" title="Public admission requirement pages are not available">View Public/);
  assert.doesNotMatch(html, /href="[^\"]+">View Public/);
});

test("builds university-scoped sidebar navigation without a coming-soon item", () => {
  assert.equal(universityRequirementsHref("/admin/university-data/universities/university-id/scholarships"), "/admin/university-data/universities/university-id/requirements");
  assert.equal(universityRequirementsHref("/admin/university-data/universities"), null);
  const navigation = readFileSync(new URL("../app/admin/admin-navigation.tsx", import.meta.url), "utf8");
  assert.match(navigation, /Admission Requirements", universityScoped: true/);
  assert.doesNotMatch(navigation, /Admission Requirements" \},/);
});

test("includes hover, active, sticky, and responsive presentation hooks", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /requirement-management-statistics > div:hover/);
  assert.match(css, /requirement-management-statistics > div\.is-active/);
  assert.match(css, /requirement-statistic-link[^}]*cursor: pointer/);
  assert.match(css, /requirement-management-table thead th[^}]*position: sticky/);
  assert.match(css, /requirement-management-statistics,.requirement-management-filters[^\{]*\{ grid-template-columns: 1fr; \}/);
  assert.match(css, /requirement-management-page \{ min-width: 0/);
});

test("builds the protected request and preserves permission behavior without a database", async () => {
  const url = buildAdmissionRequirementManagementApiUrl("https://example.test", "university-id", filters);
  assert.equal(url.pathname, "/api/admin/universities/university-id/requirements");
  assert.equal(url.searchParams.get("programId"), "program-1");
  const service = { async listUniversityRequirements() { return null; } };
  assert.equal((await handleAdminUniversityRequirementsRequest("missing-id", "allowed", {}, service)).status, 404);
  assert.equal((await handleAdminUniversityRequirementsRequest("university-id", "forbidden", {}, service)).status, 403);
  assert.equal(hasAdminPermission("SUPER_ADMIN", "manage_university_data"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_university_data"), false);
});
