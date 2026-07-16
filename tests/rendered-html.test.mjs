import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Self Apply Center homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Guided Self-Application for Global Study \| Self Apply Center<\/title>/i);
  assert.match(html, /Apply abroad yourself, with experts beside you\./i);
  assert.match(html, /A consultancy for students who do not want to feel dependent\./i);
  assert.match(html, /USA/);
  assert.match(html, /Canada/);
  assert.match(html, /South Korea/);
  assert.match(html, /images\.unsplash\.com/);
  assert.match(html, /google\.com\/maps/);
  assert.match(html, /ICEF/);
  assert.match(html, /data-account-id="6872"/);
  assert.match(html, /www-cdn\.icef\.com\/scripts\/iasbadgeid\.js/);
  assert.match(html, /tiktok\.com\/@selfapplycenter/);
  assert.match(html, /info@selfapplycenter\.com/);
  assert.match(html, /sac\.osom\.global\/1\/student/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("renders maintainable blog posts and adaptive partnership fields", async () => {
  const blog = await render("/blog");
  const blogHtml = await blog.text();
  assert.match(blogHtml, /Your 12-month study-abroad application timeline/i);
  assert.match(blogHtml, /\/blog\/study-abroad-application-timeline/);

  const article = await render("/blog/study-abroad-application-timeline");
  assert.equal(article.status, 200);
  assert.match(await article.text(), /Starting early gives you time/i);

  const partner = await render("/partner-with-us");
  const partnerHtml = await partner.text();
  assert.match(partnerHtml, /University or institution name/i);
  assert.match(partnerHtml, /Agent/i);
  assert.match(partnerHtml, /Send partnership enquiry/i);
});

test("renders page-specific frequently asked questions", async () => {
  const services = await render("/services");
  assert.match(await services.text(), /Do you review SOPs and application documents/i);

  const destinations = await render("/destinations");
  assert.match(await destinations.text(), /Which destination is best for my profile/i);

  const partner = await render("/partner-with-us");
  assert.match(await partner.text(), /Who can submit a partnership enquiry/i);

  const contact = await render("/contact");
  assert.match(await contact.text(), /When is the SAC office open/i);
});

test("renders the complete consultancy page set", async () => {
  const expectedPages = [
    ["/about", /A consultancy built around clear student decisions/i],
    ["/our-team", /People who keep your application organised/i],
    ["/services", /Complete guidance for every stage/i],
    ["/destinations", /Choose a destination that fits your profile/i],
    ["/success-stories", /Student journeys supported with patience/i],
    ["/blog", /Straightforward guidance for common study-abroad questions/i],
    ["/events", /Focused sessions for the decisions students face next/i],
    ["/contact", /Talk to a counsellor about your study goal/i],
    ["/partner-with-us", /Build clearer international study pathways/i],
  ];

  for (const [path, heading] of expectedPages) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.match(html, heading, path);
    assert.match(html, /Start your study-abroad journey with SAC/i, path);
  }
});

test("ships project branding and social-preview assets", async () => {
  const [layout, page, homePage, packageJson, siteData] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/site-data.ts", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Self Apply Center/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /\/sac-logo\.png/);
  assert.match(page, /<HomePage \/>/);
  assert.match(homePage, /self-apply-center-hero\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(siteData, /partner-with-us/);

  await Promise.all([
    access(new URL("../public/sac-logo.png", import.meta.url)),
    access(new URL("../public/self-apply-center-hero.png", import.meta.url)),
    access(new URL("../public/og.png", import.meta.url)),
  ]);
});
