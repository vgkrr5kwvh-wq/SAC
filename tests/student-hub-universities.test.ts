import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllUniversities,
  getFeaturedUniversities,
  getUniversitiesByCountry,
  getUniversityBySlug,
} from "../lib/student-hub/universities";

test("returns the complete three-record sample university catalog", () => {
  const universities = getAllUniversities();
  assert.equal(universities.length, 3);
  assert.ok(universities.every((university) => university.sampleRecord));
  assert.ok(universities.every((university) => university.programs.length > 0));
  assert.equal(new Set(universities.map((university) => university.id)).size, 3);
  assert.equal(new Set(universities.map((university) => university.slug)).size, 3);
});

test("retrieves a university by slug", () => {
  assert.equal(getUniversityBySlug("sample-northstar-university")?.name, "Sample Northstar University");
  assert.equal(getUniversityBySlug("missing-university"), undefined);
});

test("retrieves universities by typed country code", () => {
  const canadianUniversities = getUniversitiesByCountry("CA");
  assert.equal(canadianUniversities.length, 1);
  assert.ok(canadianUniversities.every((university) => university.country === "CA"));
  assert.deepEqual(getUniversitiesByCountry("GB"), []);
});

test("retrieves only active featured universities", () => {
  const featuredUniversities = getFeaturedUniversities();
  assert.deepEqual(featuredUniversities.map((university) => university.slug), ["sample-northstar-university"]);
  assert.ok(featuredUniversities.every((university) => university.featured && university.active));
});
