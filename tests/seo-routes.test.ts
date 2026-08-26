import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots";
import { metadata as homeMetadata } from "../app/page";
import { generateMetadata as generateStaticPageMetadata } from "../app/[slug]/page";
import { hasLegacyWordPressQuery } from "../lib/seo/legacy-wordpress-query";

test("detects exact legacy WordPress query keys regardless of their values", () => {
  for (const query of [
    "p=19319",
    "p=",
    "p=abc",
    "p=1&p=2",
    "page_id=1",
    "attachment_id=1",
    "cat=1",
    "tag=casino",
    "author=1",
    "s=casino",
    "m=202001",
    "utm_source=test&p=19319",
  ]) {
    assert.equal(hasLegacyWordPressQuery(new URLSearchParams(query)), true, query);
  }

  for (const query of ["", "utm_source=test", "P=1", "page=1", "search=casino"]) {
    assert.equal(hasLegacyWordPressQuery(new URLSearchParams(query)), false, query);
  }
});

test("defines self-referencing canonicals for the homepage and static public pages", async () => {
  assert.equal(String(homeMetadata.alternates?.canonical), "https://selfapplycenter.com/");
  const aboutMetadata = await generateStaticPageMetadata({ params: Promise.resolve({ slug: "about" }) });
  assert.equal(aboutMetadata.alternates?.canonical, "/about");
});

test("allows public pages while excluding private and API routes from robots", () => {
  const result = robots();
  assert.deepEqual(result.rules, {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin", "/api/", "/login"],
  });
  assert.equal(result.sitemap, "https://selfapplycenter.com/sitemap.xml");
  assert.equal(result.host, "https://selfapplycenter.com");
});
