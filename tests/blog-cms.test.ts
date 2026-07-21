import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarkdownContent from "../components/blog/markdown-content";
import BlogPostForm from "../components/admin/blog-post-form";
import { formatNepalDateTimeInput, parseNepalDateTimeInput } from "../lib/blog/dates";
import { estimateReadingTime } from "../lib/blog/reading-time";
import { createBlogSlug } from "../lib/blog/slug";
import { buildPublicBlogWhere, blogPostInputSchema, isBlogPostPublic, parseBlogPostInput, resolveBlogPublishedAt } from "../lib/blog/validation";
import { buildBlogSitemapEntries } from "../lib/blog/sitemap";
import { createInitialBlogFormState } from "../lib/blog/form-state";

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
