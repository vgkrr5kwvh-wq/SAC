import assert from "node:assert/strict";
import test from "node:test";
import { universityDisplayName } from "../lib/university-intelligence/university-name";
import { mapUniversityToSummary } from "../lib/university-intelligence/mappers/university.mapper";
import { extractOfficialUniversityProfileClaims } from "../src/lib/university-import/enrichment/extractors/university-profile";
import { activityStatus, activityTimestamp } from "../app/admin/university-data/universities/[id]/_components/university-management-overview";

test("removes a generic homepage suffix without university-specific hardcoding", () => {
  assert.equal(universityDisplayName("Auburn University homepage"), "Auburn University");
  assert.equal(universityDisplayName("Example University | Home Page"), "Example University");
  assert.equal(universityDisplayName("Homepage University"), "Homepage University");
});

test("official extraction and shared DTO mapping both correct legacy homepage names", () => {
  const claims = extractOfficialUniversityProfileClaims({
    url: "https://example.edu/",
    finalUrl: "https://example.edu/",
    label: "Homepage",
    kind: "homepage",
    status: 200,
    html: "<h1>Example University homepage</h1>",
    accessIssue: null,
    checkedAt: new Date("2026-07-25T00:00:00Z"),
  }, "example-university", "example.edu");
  assert.equal(claims.find((claim) => claim.fieldName === "officialName")?.value, "Example University");

  const summary = mapUniversityToSummary({
    id: "university-id",
    name: "Example University homepage",
    slug: "example-university",
    country: null,
    state: null,
    city: null,
    address: null,
    institutionType: null,
    foundedYear: null,
    description: null,
    officialWebsiteUrl: null,
    logoUrl: null,
    bannerImageUrl: null,
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { programs: 0 },
  });
  assert.equal(summary.name, "Example University");
});

test("formats supported activity states and human timestamps", () => {
  assert.equal(activityStatus("COMPLETED"), "Completed ✓");
  assert.equal(activityStatus("APPROVED"), "Approved ✓");
  assert.equal(activityStatus("PENDING"), "Pending ⏳");
  assert.equal(activityStatus("REJECTED"), "Rejected ✕");
  const now = new Date("2026-08-01T12:00:00Z");
  assert.equal(activityTimestamp("2026-08-01T11:58:00Z", now), "2 minutes ago");
  assert.equal(activityTimestamp("2026-07-31T12:00:00Z", now), "Yesterday");
  assert.equal(activityTimestamp("2026-07-25T12:00:00Z", now), "Jul 25, 2026");
});
