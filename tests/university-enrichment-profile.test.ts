import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  conciseFactualDescription,
  extractOfficialUniversityProfileClaims,
} from "../src/lib/university-import/enrichment/extractors/university-profile";
import type { OfficialPageSnapshot } from "../src/lib/university-import/enrichment/types";

const fixture = () => readFile(
  new URL("./fixtures/university-enrichment/official-profile-generic.html", import.meta.url),
  "utf8",
);

test("extracts reusable university profile claims only from official metadata", async () => {
  const page: OfficialPageSnapshot = {
    url: "http://www.example.edu/",
    finalUrl: "https://www.example.edu/",
    label: "Homepage",
    kind: "homepage",
    status: 200,
    html: await fixture(),
    accessIssue: null,
    checkedAt: new Date("2026-07-25T00:00:00Z"),
  };
  const claims = extractOfficialUniversityProfileClaims(page, "example-state-university", "example.edu");
  const values = new Map(claims.map((claim) => [claim.fieldName, claim.value]));

  assert.equal(values.get("officialName"), "Example State University");
  assert.equal(values.get("officialWebsiteUrl"), "https://example.edu/");
  assert.equal(values.get("logoUrl"), "https://example.edu/brand/logo.svg");
  assert.equal(values.get("bannerImageUrl"), "https://example.edu/media/campus-banner.webp");
  assert.equal(values.get("city"), "Example City");
  assert.equal(values.get("address"), "100 College Avenue, Example City, Texas, 75001, US");
  assert.equal(values.get("institutionType"), "Public research university");
  assert.equal(values.get("foundedYear"), 1908);
  assert.equal(values.get("campusType"), "Urban");
  assert.equal(values.get("universitySize"), "24,500 students");
  assert.equal(values.get("internationalStudentInformation"), "Students from more than 80 countries");
  assert.equal(values.get("description"), "Example State University is a public research university located in Example City.");
  assert.equal(claims.every((claim) =>
    claim.sourceName === "official-university"
    && claim.authorityLevel === "OFFICIAL_UNIVERSITY"
    && claim.confidence === 95
    && claim.sourceUrl === "https://www.example.edu/"
  ), true);
});

test("rejects unsafe image URLs and non-factual or marketing descriptions", () => {
  const page: OfficialPageSnapshot = {
    url: "https://example.edu/",
    finalUrl: "https://example.edu/",
    label: "Homepage",
    kind: "homepage",
    status: 200,
    html: `
      <meta name="description" content="Join our world-class community and discover your future.">
      <script type="application/ld+json">
        {"@type":"CollegeOrUniversity","name":"Example University","logo":"https://cdn.example.net/logo.svg"}
      </script>
      <meta name="university:banner" content="http://example.edu/banner.jpg">
    `,
    accessIssue: null,
    checkedAt: new Date(),
  };
  const values = new Map(
    extractOfficialUniversityProfileClaims(page, "example", "example.edu")
      .map((claim) => [claim.fieldName, claim.value]),
  );
  assert.equal(values.has("logoUrl"), false);
  assert.equal(values.has("bannerImageUrl"), false);
  assert.equal(values.has("description"), false);
  assert.equal(conciseFactualDescription("A vibrant, world-class experience awaits you."), null);
});

test("does not extract profile claims from blocked or non-homepage pages", async () => {
  const base: OfficialPageSnapshot = {
    url: "https://example.edu/",
    finalUrl: "https://example.edu/",
    label: "Homepage",
    kind: "homepage",
    status: 403,
    html: await fixture(),
    accessIssue: "HTTP 403",
    checkedAt: new Date(),
  };
  assert.deepEqual(extractOfficialUniversityProfileClaims(base, "example", "example.edu"), []);
  assert.deepEqual(extractOfficialUniversityProfileClaims(
    { ...base, status: 200, kind: "tuition" },
    "example",
    "example.edu",
  ), []);
});
