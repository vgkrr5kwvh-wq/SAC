import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractStudiesOverseasHtml } from "../src/lib/university-import/sources/studies-overseas/extract";
import { mapStudiesOverseasUniversity } from "../src/lib/university-import/sources/studies-overseas/map";
import { extractUniversityStudyHtml } from "../src/lib/university-import/sources/university-study/extract";
import {
  filterUniversityStudyEntries,
  parseUniversityStudyDestinationsHtml,
  universityStudyListingUrl,
} from "../src/lib/university-import/sources/university-study/discover";
import { mapUniversityStudyUniversity } from "../src/lib/university-import/sources/university-study/map";

const fixture = (name: string) => readFile(new URL(`fixtures/university-import/${name}`, import.meta.url), "utf8");

test("parses rendered University Study destination sections and excludes unrelated links", async () => {
  const parsedEntries = parseUniversityStudyDestinationsHtml(
    await fixture("university-study-destinations.html"),
  );
  const usaEntries = filterUniversityStudyEntries(parsedEntries);
  const croatiaEntries = filterUniversityStudyEntries(parsedEntries, "Croatia");
  const ukEntries = filterUniversityStudyEntries(parsedEntries, "UNITED KINGDOM");
  const entries = [...croatiaEntries, ...usaEntries, ...ukEntries];
  assert.deepEqual(entries.map(({ name, stateOrRegion, country }) => ({ name, stateOrRegion, country })), [
    { name: "Algebra University", stateOrRegion: "INTERNATIONAL", country: "Croatia" },
    { name: "Alabama Example University", stateOrRegion: "ALABAMA", country: "USA" },
    { name: "Arkansas Example University — Undergraduate", stateOrRegion: "ARKANSAS", country: "USA" },
    { name: "Arkansas Example University — Graduate", stateOrRegion: "ARKANSAS", country: "USA" },
    { name: "Saint Louis University", stateOrRegion: "MISSOURI", country: "USA" },
    { name: "Truman State University", stateOrRegion: "MISSOURI", country: "USA" },
    { name: "California Example Institute", stateOrRegion: "CALIFORNIA", country: "USA" },
    { name: "Northbridge University", stateOrRegion: "INTERNATIONAL", country: "United Kingdom" },
  ]);
  assert.equal(entries.length, 8);
  assert.equal(usaEntries.length, 6);
  assert.equal(croatiaEntries.length, 1);
  assert.equal(ukEntries.length, 1);
  assert.equal(filterUniversityStudyEntries(parsedEntries).slice(0, 1)[0].name, "Alabama Example University");
  assert.ok(usaEntries.every((entry) => entry.country === "USA"));
  assert.equal(
    entries.find((entry) => entry.name === "Alabama Example University")?.officialWebsiteUrl,
    "https://www.alabama-example.edu/",
  );
  assert.ok(entries.every((entry) => entry.sourceListingUrl === universityStudyListingUrl));
  assert.ok(entries.every((entry) => !entry.officialWebsiteUrl.includes("google.")));
  assert.ok(entries.every((entry) => !entry.officialWebsiteUrl.includes("footer-example")));
  assert.ok(entries.every((entry) => !entry.officialWebsiteUrl.includes("news.example")));
});

test("extracts only conservative University Study official-site fields", async () => {
  const officialWebsiteUrl = "https://www.example-state.edu/";
  const raw = extractUniversityStudyHtml(
    await fixture("university-study-profile.html"),
    officialWebsiteUrl,
    {
      name: "Example State University",
      officialWebsiteUrl,
      stateOrRegion: "COLORADO",
      country: "USA",
      sourceListingUrl: universityStudyListingUrl,
    },
  );
  const normalized = mapUniversityStudyUniversity(raw);
  assert.equal(normalized.name, "Example State University");
  assert.equal(normalized.officialDomain, "example-state.edu");
  assert.equal(normalized.sourceUniversityUrl, universityStudyListingUrl);
  assert.equal(normalized.state, "COLORADO");
  assert.equal(normalized.country, "USA");
  assert.deepEqual(normalized.programs, []);
  assert.deepEqual(normalized.tuition, []);
  assert.deepEqual(normalized.admissionRequirements, []);
  assert.equal(normalized.scholarships[0].scholarshipAvailable, "UNKNOWN");
  assert.equal(normalized.scholarships[0].sourceUrl, universityStudyListingUrl);
});

test("extracts a Studies Overseas fixture without inventing scholarship data", async () => {
  const sourceUrl = "https://www.studies-overseas.com/universities/fixture-technical";
  const raw = extractStudiesOverseasHtml(await fixture("studies-overseas-profile.html"), sourceUrl);
  const normalized = mapStudiesOverseasUniversity(raw);
  assert.equal(normalized.name, "Fixture Technical University");
  assert.equal(normalized.scholarships.length, 1);
  assert.equal(normalized.scholarships[0].scholarshipAvailable, "UNKNOWN");
  assert.equal(normalized.scholarships[0].scholarshipUrl, null);
});
