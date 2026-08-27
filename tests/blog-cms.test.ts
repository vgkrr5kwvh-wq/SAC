import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownContent from "../components/blog/markdown-content";
import BlogPostForm from "../components/admin/blog-post-form";
import BlogCard from "../components/blog/blog-card";
import { formatNepalDateTimeInput, parseNepalDateTimeInput } from "../lib/blog/dates";
import { estimateReadingTime } from "../lib/blog/reading-time";
import { createBlogSlug } from "../lib/blog/slug";
import { buildPublicBlogWhere, blogPostInputSchema, isBlogPostPublic, parseBlogPostInput, resolveBlogPublishedAt } from "../lib/blog/validation";
import { buildBlogSitemapEntries } from "../lib/blog/sitemap";
import { createInitialBlogFormState } from "../lib/blog/form-state";
import { getHomepageBlogPosts, publicBlogOrderBy, type PublicBlogPost } from "../lib/blog/queries";
import { shouldUseBlogHero } from "../lib/blog/params";

test("normalizes blog slugs", () => {
  assert.equal(createBlogSlug("Study in USA 2026"), "study-in-usa-2026");
  assert.equal(createBlogSlug("  Canada   Visa Update!!!  "), "canada-visa-update");
  assert.equal(createBlogSlug("---HELLO---WORLD---"), "hello-world");
  assert.equal(createBlogSlug("!!!"), "");
});

test("estimates Markdown reading time", () => {
  assert.equal(estimateReadingTime(""), 1);
  assert.equal(estimateReadingTime("short article"), 1);
  assert.equal(estimateReadingTime(Array(200).fill("word").join(" ")), 1);
  assert.equal(estimateReadingTime(Array(201).fill("word").join(" ")), 2);
  assert.equal(estimateReadingTime("# Heading\n\n**two** [three](https://example.com)"), 1);
});

const valid = { title: "Study in Canada", slug: "study-in-canada", excerpt: "Useful advice", content: "# Start\n\nContent", coverImageUrl: "https://example.com/cover.jpg", status: "DRAFT", featured: false, seoTitle: "Study in Canada", metaDescription: "A practical guide.", publishedAt: "" };

test("initializes every blog form value before the initial render", () => {
  const state = createInitialBlogFormState(valid as typeof valid & { status: "DRAFT" }, []);
  assert.deepEqual(state.errors, {});
  assert.equal(state.values.categoryIds, "");
  assert.deepEqual(state.values.categoryIds.split(",").filter(Boolean), []);
  for (const field of ["title", "slug", "excerpt", "content", "coverImageUrl", "status", "featured", "seoTitle", "metaDescription", "publishedAt"]) {
    assert.equal(typeof state.values[field], "string");
  }
});

test("renders the create form without prior validation state", () => {
  const html = renderToStaticMarkup(createElement(BlogPostForm, {
    postId: null,
    initialValues: { ...valid, status: "DRAFT" as const },
    categories: [{ id: "c12345678901234567890", name: "Study Guides", isActive: true }],
    selectedCategoryIds: [],
    media: [],
  }));
  assert.match(html, /<form[^>]*class="admin-blog-form"/);
  assert.match(html, /name="categoryIds"/);
  assert.doesNotMatch(html, /checked=""/);
});

test("validates draft and published blog posts", () => {
  assert.equal(blogPostInputSchema.safeParse(valid).success, true);
  const now = new Date("2026-07-18T12:00:00.000Z");
  assert.deepEqual(parseBlogPostInput({ ...valid, status: "PUBLISHED" }, now).publishedAt, now);
});

test("rejects invalid blog fields", () => {
  for (const invalid of [
    { ...valid, title: "" },
    { ...valid, content: "  " },
    { ...valid, slug: "!!!" },
    { ...valid, status: "ARCHIVED" },
    { ...valid, coverImageUrl: "not-a-url" },
    { ...valid, coverImageUrl: "http://example.com/cover.jpg" },
    { ...valid, coverImageUrl: "javascript:alert(1)" },
    { ...valid, seoTitle: "x".repeat(71) },
    { ...valid, metaDescription: "x".repeat(161) },
  ]) assert.equal(blogPostInputSchema.safeParse(invalid).success, false);
});

test("enforces public visibility rules", () => {
  const now = new Date("2026-07-18T12:00:00.000Z");
  assert.equal(isBlogPostPublic({ status: "DRAFT", publishedAt: now }, now), false);
  assert.equal(isBlogPostPublic({ status: "PUBLISHED", publishedAt: new Date("2026-07-19T00:00:00Z") }, now), false);
  assert.equal(isBlogPostPublic({ status: "PUBLISHED", publishedAt: now }, now), true);
  assert.deepEqual(buildPublicBlogWhere(now), { status: "PUBLISHED", publishedAt: { not: null, lte: now } });
});

function publicPost(slug: string, featured: boolean, publishedAt: Date): PublicBlogPost & { publishedAt: Date } {
  return { title: slug, slug, excerpt: `${slug} excerpt`, content: `${slug} article content`, coverImageUrl: `https://example.com/${slug}.jpg`, seoTitle: null, metaDescription: null, featured, publishedAt, updatedAt: publishedAt, categories: [{ name: "Study Guides", slug: "study-guides" }] };
}

test("uses latest published posts only when no eligible featured posts exist", async () => {
  const latest = [
    publicPost("latest-three", false, new Date("2026-07-03T00:00:00Z")),
    publicPost("latest-two", false, new Date("2026-07-02T00:00:00Z")),
    publicPost("latest-one", false, new Date("2026-07-01T00:00:00Z")),
  ];
  const calls: Array<{ where: Record<string, unknown>; take: number }> = [];
  const result = await getHomepageBlogPosts(3, new Date("2026-07-10T00:00:00Z"), async (args) => {
    calls.push({ where: args.where as Record<string, unknown>, take: args.take });
    return args.where.featured ? [] : latest;
  });
  assert.deepEqual(result.map((post) => post.slug), ["latest-three", "latest-two", "latest-one"]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].where, { status: "PUBLISHED", publishedAt: { not: null, lte: new Date("2026-07-10T00:00:00Z") }, featured: true });
  assert.equal(calls[0].take, 3);
});

test("homepage visibility rules exclude featured drafts and future posts", () => {
  const now = new Date("2026-07-10T00:00:00Z");
  assert.equal(isBlogPostPublic({ status: "DRAFT", publishedAt: new Date("2026-07-01T00:00:00Z") }, now), false);
  assert.equal(isBlogPostPublic({ status: "PUBLISHED", publishedAt: new Date("2026-07-11T00:00:00Z") }, now), false);
  assert.equal(isBlogPostPublic({ status: "PUBLISHED", publishedAt: new Date("2026-07-09T00:00:00Z") }, now), true);
});

test("returns only eligible featured posts without filling unused positions", async () => {
  for (const count of [1, 2, 3, 4]) {
    const featured = Array.from({ length: count }, (_, index) => publicPost(`featured-${count - index}`, true, new Date(Date.UTC(2026, 6, count - index))));
    let calls = 0;
    const result = await getHomepageBlogPosts(3, new Date("2026-07-10T00:00:00Z"), async (args) => {
      calls += 1;
      assert.equal(args.where.featured, true);
      assert.deepEqual(args.orderBy, [{ publishedAt: "desc" }, { id: "desc" }]);
      return featured.slice(0, args.take);
    });
    assert.equal(result.length, Math.min(count, 3));
    assert.deepEqual(result.map((post) => post.slug), featured.slice(0, 3).map((post) => post.slug));
    assert.equal(calls, 1);
  }
});

test("keeps featured-first blog ordering and limits hero layout to the first result", () => {
  assert.deepEqual(publicBlogOrderBy, [{ featured: "desc" }, { publishedAt: "desc" }, { id: "desc" }]);
  assert.equal(shouldUseBlogHero(1, 0, true), true);
  assert.equal(shouldUseBlogHero(1, 1, true), false);
  assert.equal(shouldUseBlogHero(1, 0, false), false);
  assert.equal(shouldUseBlogHero(2, 0, true), false);
});

test("separates the featured badge from hero layout while preserving card content", () => {
  const post = publicPost("featured-guide", true, new Date("2026-07-03T00:00:00Z"));
  const standardHtml = renderToStaticMarkup(createElement(BlogCard, { post }));
  assert.match(standardHtml, /class="blog-card cms-blog-card is-featured"/);
  assert.doesNotMatch(standardHtml, /is-hero/);
  assert.match(standardHtml, /Featured/);
  assert.match(standardHtml, /featured-guide excerpt/);
  assert.match(standardHtml, /Study Guides/);
  assert.match(standardHtml, /3 July 2026/);
  assert.match(standardHtml, /1 min read/);
  assert.match(standardHtml, /https:\/\/example\.com\/featured-guide\.jpg/);
  const heroHtml = renderToStaticMarkup(createElement(BlogCard, { post, hero: true }));
  assert.match(heroHtml, /is-featured is-hero/);
});

test("blog mutations revalidate both homepage and blog index", () => {
  const actions = readFileSync(new URL("../app/admin/blog/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /revalidatePath\("\/blog"\);\s*revalidatePath\("\/"\);/);
  assert.equal((actions.match(/revalidatePath\("\/"\)/g) ?? []).length, 2);
});

test("uses explicit responsive hero classes instead of featured status for layout", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.blog-card\.is-hero/);
  assert.match(css, /@media \(max-width: 1020px\)[\s\S]*\.blog-card\.is-hero/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.featured-insights-grid/);
  assert.doesNotMatch(css, /\.blog-card\.featured/);
});

test("builds blog sitemap entries from public records only", () => {
  const updatedAt = new Date("2026-07-18T12:00:00.000Z");
  const entries = buildBlogSitemapEntries([{ slug: "public-guide", updatedAt }], [{ slug: "study-guides", updatedAt }]);
  assert.deepEqual(entries.map((entry) => entry.url), ["https://selfapplycenter.com/blog", "https://selfapplycenter.com/blog/public-guide", "https://selfapplycenter.com/blog/category/study-guides"]);
  assert.equal("lastModified" in entries[1] ? entries[1].lastModified : null, updatedAt);
});

test("converts Nepal date-time input independently of server timezone", () => {
  const date = parseNepalDateTimeInput("2026-07-18T16:32");
  assert.equal(date?.toISOString(), "2026-07-18T10:47:00.000Z");
  assert.equal(formatNepalDateTimeInput(date), "2026-07-18T16:32");
  assert.equal(parseNepalDateTimeInput("2026-02-30T10:00"), null);
});

test("retains the original publication date when a published post becomes a draft", () => {
  const original = new Date("2026-07-01T06:15:00.000Z");
  const replacement = new Date("2026-07-15T06:15:00.000Z");
  assert.equal(resolveBlogPublishedAt({
    nextStatus: "DRAFT",
    submittedPublishedAt: replacement,
    existingStatus: "PUBLISHED",
    existingPublishedAt: original,
  }), original);
  assert.equal(resolveBlogPublishedAt({
    nextStatus: "PUBLISHED",
    submittedPublishedAt: replacement,
    existingStatus: "DRAFT",
    existingPublishedAt: null,
  }), replacement);
});

test("sanitizes Markdown and renders only safe HTTPS content images", () => {
  const html = renderToStaticMarkup(createElement(MarkdownContent, {
    content: [
      "<script>alert('unsafe')</script>",
      "<span onclick=\"alert('unsafe')\">raw html</span>",
      "[unsafe](javascript:alert('unsafe'))",
      "![Campus](https://cdn.example.com/campus.png)",
      "![unsafe](http://example.com/unsafe.png)",
      "[Safe external link](https://example.com/guide)",
    ].join("\n\n"),
  }));

  assert.doesNotMatch(html, /<script|onclick=|javascript:|unsafe\.png/i);
  assert.doesNotMatch(html, /<span/i);
  assert.match(html, /unsafe/);
  assert.match(html, /href="https:\/\/example\.com\/guide"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /<img src="https:\/\/cdn\.example\.com\/campus\.png" alt="Campus" loading="lazy" referrerPolicy="no-referrer"/);
  const headings = renderToStaticMarkup(createElement(MarkdownContent, { content: "# Article heading" }));
  assert.doesNotMatch(headings, /<h1/);
  assert.match(headings, /<h2>Article heading<\/h2>/);
});
