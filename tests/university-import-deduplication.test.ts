import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateUniversity } from "../src/lib/university-import/deduplication";
import { mapUniversityStudyUniversity } from "../src/lib/university-import/sources/university-study/map";

function incoming(overrides: Record<string, unknown> = {}) {
  return mapUniversityStudyUniversity({
    sourceUniversityUrl: "https://universitystudy.com/universities/example",
    name: "Example State University",
    city: "Austin",
    state: "Texas",
    officialWebsiteUrl: "https://example.edu",
    ...overrides,
  });
}

test("automatically matches a verified official domain", () => {
  assert.deepEqual(deduplicateUniversity(incoming(), [{
    id: "u1",
    name: "Different Display Name",
    city: null,
    state: null,
    officialWebsiteUrl: "https://www.example.edu/admissions",
  }]), { kind: "AUTO_MATCH", universityId: "u1", reason: "official-domain" });
});

test("requires a strong name plus location match when no domain is available", () => {
  assert.deepEqual(deduplicateUniversity(incoming({ officialWebsiteUrl: null }), [{
    id: "u1",
    name: "The Example State University",
    city: "Austin",
    state: "TX",
    officialWebsiteUrl: null,
  }]), { kind: "AUTO_MATCH", universityId: "u1", reason: "strong-name-location" });
});

test("never merges on name alone or when official domains conflict", () => {
  for (const candidate of [
    { id: "u1", name: "Example State University", city: "Denver", state: "Colorado", officialWebsiteUrl: null },
    { id: "u1", name: "Example State University", city: "Austin", state: "Texas", officialWebsiteUrl: "https://conflict.edu" },
  ]) {
    assert.equal(deduplicateUniversity(incoming(), [candidate]).kind, "MANUAL_REVIEW");
  }
});

test("supports known aliases but still requires matching location", () => {
  const result = deduplicateUniversity(incoming({ officialWebsiteUrl: null, aliases: ["ESU"] }), [{
    id: "u1",
    name: "ESU",
    aliases: ["Example State"],
    city: "Austin",
    state: "Texas",
    officialWebsiteUrl: null,
  }]);
  assert.equal(result.kind, "AUTO_MATCH");
});

