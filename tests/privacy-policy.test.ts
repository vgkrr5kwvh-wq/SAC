import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPolicyPage, { metadata } from "../app/privacy-policy/page";

test("renders the operational privacy notice with required analytics disclosures", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPolicyPage));
  assert.match(html, /first-party cookie/i);
  assert.match(html, /up to one year/i);
  assert.match(html, /random and pseudonymous/i);
  assert.match(html, /HMAC-derived identifiers/i);
  assert.match(html, /Raw IP addresses[^.]*not persisted/i);
  assert.match(html, /Estimated unique browsers/i);
  assert.match(html, /180 days/i);
  assert.match(html, /not invented or backfilled/i);
  assert.match(html, /deleting a blog post also deletes its raw article analytics/i);
  assert.match(html, /Authenticated CMS and administrative activity is excluded/i);
  assert.match(html, /info@selfapplycenter\.com/i);
  assert.doesNotMatch(html, /we use (?:Google Analytics|gtag|a third-party readership analytics SDK)/i);
});

test("publishes indexable self-referencing privacy metadata", () => {
  assert.equal(metadata.title, "Privacy Policy");
  assert.match(String(metadata.description), /first-party blog readership analytics/i);
  assert.equal(metadata.alternates?.canonical, "/privacy-policy");
  assert.deepEqual(metadata.robots, { index: true, follow: true });
});

test("adds the privacy link to the existing footer without changing main navigation", () => {
  const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
  assert.match(footer, /href="\/privacy-policy"[^>]*>Privacy Policy/);
  for (const href of ["/about", "/our-team", "/partner-with-us", "/events", "/services", "/destinations", "/success-stories", "/blog"]) {
    assert.match(footer, new RegExp(`href="${href}"`), href);
  }
  const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(header, /privacy-policy|Privacy Policy/);
});

test("adds only the standalone privacy route to the established static sitemap entries", () => {
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /siteUrl\}\/privacy-policy/);
  assert.equal((sitemap.match(/privacy-policy/g) ?? []).length, 1);
});
