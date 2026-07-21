import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots";

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
