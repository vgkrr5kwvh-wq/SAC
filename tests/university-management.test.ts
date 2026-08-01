import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildUniversityManagementApiUrl,
  fetchUniversityManagement,
} from "../lib/university-intelligence/api/university-management.client";
import { universityManagementFilters } from "../app/admin/university-data/universities/page";

test("normalizes supported university management filters", () => {
  assert.deepEqual(universityManagementFilters({
    q: " Auburn ",
    country: " United States ",
    publicationStatus: "DRAFT",
    verificationStatus: "OFFICIAL_VERIFIED",
  }), {
    query: "Auburn",
    country: "United States",
    publicationStatus: "DRAFT",
    verificationStatus: "OFFICIAL_VERIFIED",
  });
  assert.equal(universityManagementFilters({ publicationStatus: "INVALID" }).publicationStatus, undefined);
});

test("builds and fetches the protected university management API request", async () => {
  const url = buildUniversityManagementApiUrl("https://example.test", {
    query: "Auburn",
    country: "United States",
    publicationStatus: "PUBLISHED",
  });
  assert.equal(url.pathname, "/api/admin/universities");
  assert.equal(url.searchParams.get("q"), "Auburn");

  let cookie = "";
  await fetchUniversityManagement("https://example.test", {}, "session=test", async (_input, init) => {
    cookie = new Headers(init?.headers).get("cookie") ?? "";
    return Response.json({ result: { universities: [], statistics: {}, countries: [] } });
  });
  assert.equal(cookie, "session=test");
});

test("renders required university management controls and safe actions", () => {
  const page = readFileSync(new URL("../app/admin/university-data/universities/page.tsx", import.meta.url), "utf8");
  assert.match(page, /University Management/);
  assert.match(page, /No universities have been imported yet\./);
  assert.match(page, />Import University<\/button>/);
  assert.match(page, /href=\{`\/admin\/university-data\/universities\/\$\{university\.id\}`\}>Manage/);
  assert.match(page, /university\.publicationStatus === "PUBLISHED"/);
  assert.doesNotMatch(page, /from "@\/lib\/prisma"/);
});
