import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { hasAdminPermission } from "../lib/admin-authorization";
import ReviewControls, {
  ReviewActionButtons,
} from "../app/admin/university-data/review/review-controls";
import {
  isReviewEligibleStatus,
  reviewQueueWhere,
} from "../app/admin/university-data/review/review-queue";

function renderControls(status: "STAGED" | "MANUAL_REVIEW", claimCount = 36): string {
  return renderToStaticMarkup(createElement(ReviewControls, {
    recordId: "cms0i8jf20002rjvu56qxvkha",
    enrichment: true,
    status,
    entityType: "university-enrichment",
    createdAt: "2026-07-25T15:09:07.020Z",
    claimCount,
  }));
}

test("top review controls render status, metadata, decisions, and record ID for staged enrichment", () => {
  const html = renderControls("STAGED");
  assert.match(html, /id="review-actions-cms0i8jf20002rjvu56qxvkha"/);
  assert.match(html, /name="recordId" value="cms0i8jf20002rjvu56qxvkha"/);
  assert.match(html, /STAGED/);
  assert.match(html, /university enrichment/);
  assert.match(html, /2026-07-25T15:09:07.020Z/);
  assert.match(html, />36</);
  assert.match(html, /<button[^>]*value="APPROVED"[^>]*>Approve enrichment/);
  assert.match(html, /<button[^>]*value="REJECTED"[^>]*>Reject enrichment/);
  assert.match(html, /href="#claims-cms0i8jf20002rjvu56qxvkha"/);
});

test("manual-review records retain the same visible action controls", () => {
  const html = renderControls("MANUAL_REVIEW");
  assert.match(html, /MANUAL REVIEW/);
  assert.match(html, /Approve enrichment/);
  assert.match(html, /Reject enrichment/);
});

test("review eligibility includes staged and manual review but excludes approved", () => {
  assert.deepEqual(reviewQueueWhere, {
    status: { in: ["STAGED", "MANUAL_REVIEW"] },
  });
  assert.equal(isReviewEligibleStatus("STAGED"), true);
  assert.equal(isReviewEligibleStatus("MANUAL_REVIEW"), true);
  assert.equal(isReviewEligibleStatus("APPROVED"), false);
});

test("approve and reject submit the expected decisions and pending disables both", () => {
  const html = renderToStaticMarkup(createElement("form", null,
    createElement("input", {
      type: "hidden",
      name: "recordId",
      value: "cms0i8jf20002rjvu56qxvkha",
    }),
    createElement(ReviewActionButtons, { enrichment: true, pending: true }),
  ));
  assert.match(html, /name="recordId" value="cms0i8jf20002rjvu56qxvkha"/);
  assert.match(html, /<button(?=[^>]*value="APPROVED")(?=[^>]*disabled="")[^>]*>/);
  assert.match(html, /<button(?=[^>]*value="REJECTED")(?=[^>]*disabled="")[^>]*>/);
  assert.equal((html.match(/<form/g) ?? []).length, 1);
});

test("long claim lists do not remove the shared top action form", () => {
  const controls = renderControls("STAGED", 36);
  const claims = Array.from({ length: 36 }, (_value, index) =>
    `<details${index === 0 ? " open" : ""}><summary>Claim ${index + 1}</summary></details>`
  ).join("");
  const html = `<article>${controls}<section id="claims">${claims}</section></article>`;
  assert.ok(html.indexOf("Approve enrichment") < html.indexOf("Claim 36"));
  assert.match(html, /Approve enrichment/);
  assert.match(html, /Reject enrichment/);
});

test("claim groups are collapsible and conflicts are expanded by default", async () => {
  const source = await readFile(
    new URL("../app/admin/university-data/review/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<details key=\{key\} open=\{conflict\}/);
  assert.match(source, /claims\.length\} claim/);
});

test("university review permission remains SUPER_ADMIN-only", () => {
  assert.equal(hasAdminPermission("SUPER_ADMIN", "manage_university_data"), true);
  assert.equal(hasAdminPermission("EDITOR", "manage_university_data"), false);
  assert.equal(hasAdminPermission("STAFF", "manage_university_data"), false);
});
