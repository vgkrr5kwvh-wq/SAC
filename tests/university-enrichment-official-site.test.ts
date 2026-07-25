import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  belongsToOfficialDomain,
  canonicalOfficialUrlIdentity,
  crawlOfficialPages,
  discoverApprovedOfficialPages,
  officialGeneralPageBudget,
  robotsDisallows,
  validateOfficialRedirect,
} from "../src/lib/university-import/enrichment/official-site";
import {
  discoverOfficialProgramLinks,
  discoverOfficialProgramLinksWithDiagnostics,
  academicProgramHeadingMatches,
  extractOfficialProgram,
  limitProgramPages,
  qualifyOfficialProgramPage,
} from "../src/lib/university-import/enrichment/extractors/programs";
import { extractStructuredOfficialClaims } from "../src/lib/university-import/enrichment/extractors/claims";
import { sanitizeDebugHtml } from "../src/lib/university-import/enrichment/debug";
import type {
  OfficialPageCandidate,
  OfficialPageSnapshot,
} from "../src/lib/university-import/enrichment/types";

const fixture = (name: string) => readFile(new URL(`fixtures/university-enrichment/${name}`, import.meta.url), "utf8");
const checkedAt = new Date("2026-07-25T00:00:00Z");
const snapshot = (
  candidate: OfficialPageCandidate,
  html: string,
): OfficialPageSnapshot => ({
  ...candidate,
  finalUrl: candidate.url,
  status: 200,
  html,
  accessIssue: null,
  checkedAt,
});

test("validates same-domain redirects and rejects external redirects", () => {
  assert.equal(belongsToOfficialDomain("https://admissions.auburn.edu/apply", "auburn.edu"), true);
  assert.equal(validateOfficialRedirect("https://auburn.edu", "https://www.auburn.edu/", "auburn.edu").valid, true);
  assert.equal(validateOfficialRedirect("https://auburn.edu", "https://pathway-provider.example/", "auburn.edu").valid, false);
  assert.equal(
    canonicalOfficialUrlIdentity("http://www.auburn.edu/scholarships/?utm_source=test#award"),
    "https://auburn.edu/scholarships",
  );
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
  assert.equal(discovered.length, 8);
  assert.equal(discovered.filter((entry) => entry.studyLevel === "undergraduate").length, 3);
  assert.equal(discovered.filter((entry) => entry.studyLevel === "graduate").length, 5);
  assert.equal(limitProgramPages(discovered).length, 8);

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

test("parses sanitized Auburn anchor, card, and list program structures", async () => {
  const undergraduate = await fixture("auburn-undergraduate-live-structure.html");
  const graduate = await fixture("auburn-graduate-live-structure.html");
  const discovery = discoverOfficialProgramLinksWithDiagnostics([
    snapshot({
      url: "https://www.auburn.edu/academics/undergraduate-majors",
      label: "Undergraduate Majors",
      kind: "program-directory-undergraduate",
    }, undergraduate),
    snapshot({
      url: "https://www.auburn.edu/graduate/programs",
      label: "Graduate Programs",
      kind: "program-directory-graduate",
    }, graduate),
  ], "auburn.edu");
  assert.equal(discovery.entries.length, 6);
  assert.equal(discovery.entries.filter((entry) => entry.studyLevel === "undergraduate").length, 3);
  assert.equal(discovery.entries.filter((entry) => entry.studyLevel === "graduate").length, 3);
  assert.equal(discovery.diagnostics[0].candidateLinksBeforeFiltering, 11);
  assert.equal(discovery.diagnostics[0].acceptedLinksAfterFiltering, 3);
  assert.equal(discovery.diagnostics[0].rejectionCounts.outsideOfficialDomain, 1);
  assert.equal(discovery.diagnostics[0].rejectionCounts.duplicate, 1);
  assert.equal(discovery.diagnostics[0].rejectionCounts.navigationOrDirectory, 1);
  assert.equal((discovery.diagnostics[0].rejectionCounts.nonProgramText ?? 0) >= 2, true);
  assert.equal(discovery.diagnostics[0].rejectionCounts.nonDegreeProgramType, 2);
  assert.equal(discovery.entries.some((entry) => /provost|bulletin|\/majors$|\/minors|certificate/i.test(entry.url)), false);
});

test("extracts conservative factual claims from ordinary official text", async () => {
  const admissions = snapshot({
    url: "https://www.auburn.edu/admissions/international",
    label: "International Admissions",
    kind: "international-admissions",
  }, await fixture("auburn-official-facts-live-structure.html"));
  const tuition = snapshot({
    url: "https://www.auburn.edu/cost",
    label: "Cost of Attendance",
    kind: "tuition",
  }, await fixture("auburn-tuition-live-structure.html"));
  const claims = [
    ...extractStructuredOfficialClaims(admissions, "auburn-university"),
    ...extractStructuredOfficialClaims(tuition, "auburn-university"),
    ...extractStructuredOfficialClaims(snapshot({
      url: "https://www.auburn.edu/scholarships",
      label: "Scholarships",
      kind: "scholarships",
    }, "<main><h1>Scholarships</h1><p>Scholarship opportunities are available to eligible first-year students.</p></main>"), "auburn-university"),
  ];
  assert.equal(claims.find((claim) => claim.fieldName === "minimumGpa")?.value, 3);
  assert.equal(claims.find((claim) => claim.fieldName === "ieltsOverall")?.value, 6.5);
  assert.equal(claims.find((claim) => claim.fieldName === "toeflOverall")?.value, 79);
  assert.equal(claims.find((claim) => claim.fieldName === "duolingoOverall")?.value, 120);
  assert.equal(claims.find((claim) => claim.fieldName === "deadline")?.value, "February 1, 2027");
  assert.equal(claims.find((claim) => claim.fieldName === "amount")?.value, 35000);
  assert.equal(claims.find((claim) => claim.fieldName === "amount")?.academicYear, "2026-27");
  assert.equal(claims.find((claim) => claim.fieldName === "scholarshipAvailable")?.value, true);
  assert.equal(claims.every((claim) => claim.sourceName === "official-university"), true);
});

test("sanitizes opt-in debug HTML without retaining session-shaped values", () => {
  const sanitized = sanitizeDebugHtml(`
    <html><head><meta name="csrf-token" content="secret"></head><body>
      <script>window.sessionToken = "secret"</script>
      <input type="hidden" name="token" value="secret">
      <form><input name="query" value="private"><button data-session="secret">Search</button></form>
      <main><h1>Programs</h1></main>
    </body></html>
  `);
  assert.doesNotMatch(sanitized, /secret|csrf|sessionToken/);
  assert.match(sanitized, /<h1>Programs<\/h1>/);
  assert.doesNotMatch(sanitized, /\svalue=/);
});

test("uses ordinary program-page metadata and retains a balanced ten-program cap", () => {
  const entries = Array.from({ length: 12 }, (_, index) => ({
    name: index === 0 ? "Accounting" : `Program ${index + 1}`,
    url: `https://www.auburn.edu/academics/programs/program-${index + 1}`,
    studyLevel: index < 6 ? "undergraduate" : "graduate",
    programType: "major",
  }));
  assert.equal(limitProgramPages(entries).length, 10);
  assert.equal(limitProgramPages(entries).filter((entry) => entry.studyLevel === "undergraduate").length, 5);
  assert.equal(limitProgramPages(entries).filter((entry) => entry.studyLevel === "graduate").length, 5);
  const program = extractOfficialProgram(snapshot({
    url: entries[0].url,
    label: entries[0].name,
    kind: "program",
  }, `<main><h1>Accounting</h1><p class="degree-level">Bachelor of Science</p><p class="college">Harbert College of Business</p><p class="credits">120 credit hours</p></main>`), entries[0]);
  assert.equal(program?.name, "Accounting");
  assert.equal(program?.degreeLevel, "Bachelor of Science");
  assert.equal(program?.department, "Harbert College of Business");
  assert.equal(program?.creditsText, "120 credit hours");
  assert.equal(program?.isStem, null);
});

test("creates official claims for every supported program metadata value", async () => {
  const entry = {
    name: "Accounting",
    url: "https://www.auburn.edu/programs/accounting",
    studyLevel: "undergraduate",
    programType: "major",
  };
  const program = extractOfficialProgram(snapshot({
    url: entry.url,
    label: entry.name,
    kind: "program",
  }, await fixture("program-generic.html")), entry);
  assert.ok(program);
  const fields = new Set(program.claims.map((claim) => claim.fieldName));
  for (const field of [
    "name", "studyLevel", "programType", "degreeLevel", "award", "department",
    "deliveryMode", "campus", "durationText", "creditsText", "officialProgramUrl",
  ]) {
    assert.equal(fields.has(field), true, `missing ${field} claim`);
  }
  assert.equal(fields.has("isStem"), false);
});

test("normalizes Auburn option, track, punctuation, degree suffix, and parent-program headings", () => {
  assert.equal(academicProgramHeadingMatches(
    "Clinical Mental Health Counseling — MEd",
    "Counselor Education – Clinical Mental Health Counseling Option — MEd",
  ), true);
  assert.equal(academicProgramHeadingMatches(
    "School Counseling (Certification) — MEd",
    "Counselor Education – School Counseling Option (Certification) — MEd",
  ), true);
  assert.equal(academicProgramHeadingMatches(
    "Educational Leadership Track — PhD",
    "Department of Education - Educational Leadership Option (Ph.D.)",
  ), true);
});

test("qualifies Auburn bulletin curricula and total-credit degree evidence", async () => {
  const clinicalEntry = {
    name: "Clinical Mental Health Counseling — MEd",
    url: "https://bulletin.auburn.edu/graduate/collegeofeducation/counseloreducation/clinical-mental-health-counseling-med/",
    studyLevel: "graduate",
    programType: "degree",
  };
  const clinical = qualifyOfficialProgramPage(snapshot({
    url: clinicalEntry.url,
    label: clinicalEntry.name,
    kind: "program",
  }, await fixture("auburn-clinical-counseling-bulletin.html")), clinicalEntry);
  assert.equal(clinical.qualified, true);
  assert.match(clinical.reason, /degree|curriculum|credit/i);

  const schoolEntry = {
    ...clinicalEntry,
    name: "School Counseling (Certification) — MEd",
    url: "https://bulletin.auburn.edu/graduate/collegeofeducation/counseloreducation/school-counseling-med/",
  };
  const school = qualifyOfficialProgramPage(snapshot({
    url: schoolEntry.url,
    label: schoolEntry.name,
    kind: "program",
  }, await fixture("auburn-school-counseling-bulletin.html")), schoolEntry);
  assert.equal(school.qualified, true);
  assert.equal(school.heading, "Counselor Education – School Counseling Option (Certification) — MEd");
});

test("continues to reject departments and standalone non-degree program types", async () => {
  const departmentEntry = {
    name: "Counselor Education",
    url: "https://www.auburn.edu/academic/departments/counselor-education/",
    studyLevel: "graduate",
    programType: "degree",
  };
  const department = qualifyOfficialProgramPage(snapshot({
    url: departmentEntry.url,
    label: departmentEntry.name,
    kind: "program",
  }, await fixture("auburn-nondegree-department.html")), departmentEntry);
  assert.equal(department.qualified, false);
  assert.match(department.reason, /degree|curriculum|credit/i);

  const concentration = qualifyOfficialProgramPage(snapshot({
    url: "https://www.auburn.edu/programs/finance-concentration",
    label: "Finance Concentration",
    kind: "program",
  }, "<main><h1>Finance Concentration</h1><p>Required Courses: 12 credit hours</p></main>"), {
    name: "Finance Concentration",
    url: "https://www.auburn.edu/programs/finance-concentration",
    studyLevel: "undergraduate",
    programType: "concentration",
  });
  assert.equal(concentration.qualified, false);
});
