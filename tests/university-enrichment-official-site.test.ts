import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  belongsToOfficialDomain,
  crawlOfficialPages,
  discoverApprovedOfficialPages,
  officialGeneralPageBudget,
  robotsDisallows,
  validateOfficialRedirect,
} from "../src/lib/university-import/enrichment/official-site";
import {
  discoverOfficialProgramLinks,
  extractOfficialProgram,
  limitProgramPages,
} from "../src/lib/university-import/enrichment/extractors/programs";
import type { OfficialPageSnapshot } from "../src/lib/university-import/enrichment/types";

const fixture = (name: string) => readFile(new URL(`fixtures/university-enrichment/${name}`, import.meta.url), "utf8");
const checkedAt = new Date("2026-07-25T00:00:00Z");

test("validates same-domain redirects and rejects external redirects", () => {
  assert.equal(belongsToOfficialDomain("https://admissions.auburn.edu/apply", "auburn.edu"), true);
  assert.equal(validateOfficialRedirect("https://auburn.edu", "https://www.auburn.edu/", "auburn.edu").valid, true);
  assert.equal(validateOfficialRedirect("https://auburn.edu", "https://pathway-provider.example/", "auburn.edu").valid, false);
});

test("discovers approved general and program-directory pages within budgets", async () => {
  const result = discoverApprovedOfficialPages(await fixture("homepage.html"), "https://www.auburn.edu/", "auburn.edu");
  assert.equal(result.general.length, officialGeneralPageBudget);
  assert.equal(result.programDirectories.length, 2);
  assert.ok(result.general.every((page) => !page.url.includes("news.")));
});

test("honors robots restrictions and records a 403 without retrying", async () => {
  assert.equal(robotsDisallows("User-agent: *\nDisallow: /private", "https://auburn.edu/private/page"), true);
  let attempts = 0;
  const pages = await crawlOfficialPages([{
    url: "https://auburn.edu/blocked",
    label: "Blocked",
    kind: "application-requirements",
  }], async (candidate) => {
    attempts += 1;
    return { ...candidate, finalUrl: candidate.url, status: 403, html: null, accessIssue: "HTTP 403", checkedAt };
  }, 8, async () => undefined);
  assert.equal(attempts, 1);
  assert.equal(pages[0].accessIssue, "HTTP 403");
});

test("separates undergraduate and graduate directories and limits program processing to ten", async () => {
  const directoryPages: OfficialPageSnapshot[] = [
    { url: "https://auburn.edu/majors", finalUrl: "https://auburn.edu/majors", label: "Undergraduate", kind: "program-directory-undergraduate", status: 200, html: await fixture("undergraduate-directory.html"), accessIssue: null, checkedAt },
    { url: "https://auburn.edu/graduate/programs", finalUrl: "https://auburn.edu/graduate/programs", label: "Graduate", kind: "program-directory-graduate", status: 200, html: await fixture("graduate-directory.html"), accessIssue: null, checkedAt },
  ];
  const discovered = discoverOfficialProgramLinks(directoryPages, "auburn.edu");
  assert.equal(discovered.length, 12);
  assert.equal(discovered.filter((entry) => entry.studyLevel === "undergraduate").length, 6);
  assert.equal(discovered.filter((entry) => entry.studyLevel === "graduate").length, 6);
  assert.equal(limitProgramPages(discovered).length, 10);

  const page: OfficialPageSnapshot = {
    url: discovered[0].url,
    finalUrl: discovered[0].url,
    label: discovered[0].name,
    kind: "program",
    status: 200,
    html: await fixture("program-generic.html"),
    accessIssue: null,
    checkedAt,
  };
  const program = extractOfficialProgram(page, discovered[0]);
  assert.equal(program?.studyLevel, "undergraduate");
  assert.equal(program?.isStem, null);
  assert.equal(program?.claims.every((claim) => claim.sourceName === "official-university"), true);
  assert.equal(program?.claims.every((claim) => claim.sourceUrl === page.finalUrl), true);
});

