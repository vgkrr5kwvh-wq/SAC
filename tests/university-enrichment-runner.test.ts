import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  enrichUniversity,
  executeEnrichment,
  type EnrichmentDependencies,
} from "../src/lib/university-import/enrichment/runner";
import { matchStudiesOverseasSource } from "../src/lib/university-import/enrichment/match-sources";
import type {
  EnrichmentTarget,
  OfficialPageCandidate,
  OfficialPageSnapshot,
} from "../src/lib/university-import/enrichment/types";

const fixture = (name: string) => readFile(new URL(`fixtures/university-enrichment/${name}`, import.meta.url), "utf8");
const target: EnrichmentTarget = {
  id: "cm12345678901234567890123",
  name: "Auburn University",
  slug: "auburn-university",
  country: "USA",
  state: "Alabama",
  city: "Auburn",
  officialWebsiteUrl: "https://www.auburn.edu/",
  verificationStatus: "DISCOVERED",
  aliases: [],
  universityStudyUrl: "https://universitystudy.com/study-destinations/",
};
const checkedAt = new Date("2026-07-25T00:00:00Z");

async function dependencies(): Promise<EnrichmentDependencies> {
  const pages: Record<string, string> = {
    "https://www.auburn.edu/": "homepage.html",
    "https://www.auburn.edu/admissions/undergraduate": "undergraduate.html",
    "https://www.auburn.edu/admissions/graduate": "graduate.html",
    "https://www.auburn.edu/admissions/international/english": "english.html",
    "https://www.auburn.edu/cost": "tuition.html",
    "https://www.auburn.edu/scholarships": "scholarships.html",
    "https://www.auburn.edu/apply/requirements": "requirements.html",
    "https://www.auburn.edu/global/pathway": "pathway.html",
    "https://www.auburn.edu/majors": "undergraduate-directory.html",
    "https://www.auburn.edu/graduate/programs": "graduate-directory.html",
  };
  const snapshot = async (candidate: OfficialPageCandidate): Promise<OfficialPageSnapshot> => ({
    ...candidate,
    finalUrl: candidate.url,
    status: 200,
    html: await fixture(pages[candidate.url] ?? "program-generic.html"),
    accessIssue: null,
    checkedAt,
  });
  return {
    studiesCatalogHtml: await fixture("studies-catalog.html"),
    fetchStudiesProfile: async () => fixture("studies-auburn.html"),
    homepage: await snapshot({ url: target.officialWebsiteUrl, label: "Homepage", kind: "homepage" }),
    fetchOfficialPage: snapshot,
    fetchProgramPage: snapshot,
    delay: async () => undefined,
  };
}

test("conservatively matches University Study and Studies Overseas records", async () => {
  const match = await matchStudiesOverseasSource(
    target,
    await fixture("studies-catalog.html"),
    async () => fixture("studies-auburn.html"),
    checkedAt,
  );
  assert.equal(match.status, "MATCHED");
  assert.equal(match.profileUrl, "https://www.studies-overseas.com/universities/usa/auburn-university");
  assert.equal(match.claims.every((claim) => claim.authorityLevel === "STUDIES_OVERSEAS"), true);
});

test("runs bounded official enrichment with pathway and direct claims separated", async () => {
  const result = await enrichUniversity(target, await dependencies());
  assert.equal(result.officialPages.length, 8);
  assert.equal(result.programDirectoryPages.length, 2);
  assert.equal(result.programs.length, 10);
  assert.equal(result.verificationStatus, "OFFICIAL_VERIFIED");
  const direct = result.claims.find((claim) => claim.fieldName === "ieltsOverall" && claim.entryRoute === "direct" && claim.studyLevel === "undergraduate");
  const pathway = result.claims.find((claim) => claim.fieldName === "ieltsOverall" && claim.entryRoute === "pathway");
  assert.equal(direct?.value, 6.5);
  assert.equal(pathway?.value, 5.5);
  assert.notEqual(direct?.entryRoute, pathway?.entryRoute);
});

test("dry-run executes with zero database writes", async () => {
  let databaseAccesses = 0;
  const database = new Proxy({}, { get() { databaseAccesses += 1; return undefined; } });
  const result = await executeEnrichment({ dryRun: true }, target, await dependencies(), database as never);
  assert.equal(result.programs.length, 10);
  assert.equal(databaseAccesses, 0);
});

