import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { after, before, test } from "node:test";

const port = 3217;
const origin = `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";

before(async () => {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk; });
  server.stderr.on("data", (chunk) => { serverOutput += chunk; });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Production server exited early:\n${serverOutput}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Production server did not become ready:\n${serverOutput}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => {
      if (server.exitCode === null) server.kill("SIGKILL");
      resolve();
    }, 2_000)),
  ]);
});

async function render(path = "/") {
  return fetch(`${origin}${path}`, { headers: { accept: "text/html" } });
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
  assert.match(html, /Trust built through clear, practical support/i);
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

test("renders the database-backed blog and adaptive partnership fields", async () => {
  const blog = await render("/blog");
  const blogHtml = await blog.text();
  assert.match(blogHtml, /Straightforward guidance for studying abroad/i);
  assert.match(blogHtml, /No articles published yet/i);

  const article = await render("/blog/not-a-published-post");
  assert.equal(article.status, 404);

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
    ["/blog", /Straightforward guidance for studying abroad/i],
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

  for (const assetPath of ["/sac-logo.png", "/self-apply-center-hero.png", "/og.png"]) {
    const response = await fetch(`${origin}${assetPath}`);
    assert.equal(response.status, 200, assetPath);
    assert.match(response.headers.get("content-type") ?? "", /^image\//i, assetPath);
  }

  const missingPage = await render("/this-page-does-not-exist");
  assert.equal(missingPage.status, 404);
});
