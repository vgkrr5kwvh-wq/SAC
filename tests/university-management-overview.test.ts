import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { hasAdminPermission } from "../lib/admin-authorization";
import type { UniversityManagementOverviewApiResult } from "../lib/university-intelligence/api/university-management-detail.client";
import UniversityManagementOverview from "../app/admin/university-data/universities/[id]/_components/university-management-overview";
import { handleAdminUniversityOverviewRequest } from "../app/api/admin/universities/[id]/route";
import { UniversityManagementService } from "../lib/university-intelligence/services/university-management.service";

function overview(overrides: Partial<UniversityManagementOverviewApiResult["university"]> = {}): UniversityManagementOverviewApiResult {
  return {
    university: {
      id: "university-immutable-id",
      name: "Auburn University",
      slug: "auburn-university",
      country: "United States",
      state: "Alabama",
      city: "Auburn",
      address: "Auburn, AL",
      institutionType: "Public",
      foundedYear: 1856,
      description: "A public research university.",
      officialWebsiteUrl: "https://www.auburn.edu/",
      logoUrl: "https://www.auburn.edu/logo.png",
      bannerImageUrl: "https://www.auburn.edu/banner.jpg",
      publicationStatus: "PUBLISHED",
      verificationStatus: "OFFICIAL_VERIFIED",
      programCount: 2,
      links: [
        { id: "link-safe", type: "program-directory-graduate-internal", label: null, url: "https://www.auburn.edu/programs" },
        { id: "link-unsafe", type: "source-listing-internal", label: "Unsafe source", url: "http://unsafe.example.test" },
      ],
      admissionRequirements: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      ...overrides,
    },
    sources: [{ id: "source-1", name: "University Study", url: "https://partner.example.test/auburn", isPrimary: true, lastCheckedAt: "2026-06-30T00:00:00.000Z", lastSuccessfulSyncAt: "2026-06-30T00:00:00.000Z" }],
    pendingReviewItems: 3,
    latestImport: { recordStatus: "IMPORTED", recordCreatedAt: "2026-06-30T00:00:00.000Z", jobStatus: "COMPLETED", jobCreatedAt: "2026-06-30T00:00:00.000Z", sourceName: "University Study" },
    latestReview: { status: "APPROVED", reviewedAt: "2026-06-30T01:00:00.000Z", reviewer: "Admin User" },
    tabCounts: { admissionRequirements: 2, tuitionRecords: 3, intakes: 4, claims: 36, sources: 1, history: 5 },
    statistics: { totalPrograms: 9, publishedPrograms: 6, totalScholarships: 4, pendingReviewItems: 3 },
  };
}

function render(data = overview()) {
  return renderToStaticMarkup(React.createElement(UniversityManagementOverview, { data }));
}

test("renders published and draft universities with correct public action behavior", () => {
  const published = render();
  assert.match(published, /Auburn University/);
  assert.match(published, /href="\/universities\/auburn-university"/);
  const draft = render(overview({ publicationStatus: "DRAFT" }));
  assert.match(draft, />Draft<\/span>/);
  assert.doesNotMatch(draft, /href="\/universities\/auburn-university"/);
});

test("renders quick statistics and missing optional fields safely", () => {
  const html = render(overview({ country: null, state: null, city: null, address: null, institutionType: null, foundedYear: null, description: null, officialWebsiteUrl: null, logoUrl: null, bannerImageUrl: null }));
  for (const value of ["Total programs", "9", "Published programs", "6", "Total scholarships", "4", "Pending review items", "3"]) assert.match(html, new RegExp(value));
  assert.match(html, /Not provided/);
  assert.match(html, /Location not provided/);
});

test("renders only safe presented resource labels and never internal link types", () => {
  const html = render();
  assert.match(html, /Program directory/);
  assert.match(html, /https:\/\/www\.auburn\.edu\/programs/);
  assert.doesNotMatch(html, /program-directory-graduate-internal/);
  assert.doesNotMatch(html, /source-listing-internal/);
  assert.doesNotMatch(html, /unsafe\.example\.test/);
});

test("shows Overview active, implemented tabs enabled, and remaining future tabs disabled", () => {
  const html = render();
  assert.match(html, /aria-current="page">Overview/);
  assert.match(html, /href="\/admin\/university-data\/universities\/university-immutable-id\/programs"/);
  assert.match(html, /href="\/admin\/university-data\/universities\/university-immutable-id\/scholarships"/);
  assert.match(html, /href="\/admin\/university-data\/universities\/university-immutable-id\/requirements"/);
  assert.match(html, /href="\/admin\/university-data\/universities\/university-immutable-id\/tuition"/);
  for (const tab of ["Intakes", "Claims", "Sources", "History"]) {
    assert.match(html, new RegExp(`aria-disabled="true"><b>${tab} \\(\\d+\\)</b><small>Coming soon`));
  }
});

test("returns 404 without a database and preserves permission behavior", async () => {
  let called = false;
  const service = { async getOverview() { called = true; return null; } };
  const missing = await handleAdminUniversityOverviewRequest("missing-id", "allowed", service);
  assert.equal(missing.status, 404);
  const forbidden = await handleAdminUniversityOverviewRequest("university-id", "forbidden", service);
  assert.equal(forbidden.status, 403);
  assert.equal(hasAdminPermission("SUPER_ADMIN", "manage_university_data"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_university_data"), false);
  assert.equal(called, true);
});

test("composes deterministic quick counts from existing repositories", async () => {
  const base = overview();
  const service = new UniversityManagementService({
    universities: { async getManagementOverviewById() { return { ...base, university: { ...base.university, createdAt: new Date(base.university.createdAt), updatedAt: new Date(base.university.updatedAt) }, sources: [], latestImport: null, latestReview: null }; } },
    programs: { async listByUniversity(_id, filters) { const totalItems = filters?.publishedOnly === false ? 9 : 6; return { items: [], pagination: { page: 1, pageSize: 1, totalItems, totalPages: totalItems } }; } },
    scholarships: { async listByUniversity() { return { items: [], pagination: { page: 1, pageSize: 1, totalItems: 4, totalPages: 4 } }; } },
  });
  const result = await service.getOverview("university-immutable-id");
  assert.deepEqual(result?.statistics, { totalPrograms: 9, publishedPrograms: 6, totalScholarships: 4, pendingReviewItems: 3 });
});

test("listing Manage action uses immutable university ID", () => {
  const listing = readFileSync(new URL("../app/admin/university-data/universities/page.tsx", import.meta.url), "utf8");
  assert.match(listing, /href=\{`\/admin\/university-data\/universities\/\$\{university\.id\}`\}>Manage/);
  assert.doesNotMatch(listing, /universities\/\$\{university\.slug\}`\}>Manage/);
});
