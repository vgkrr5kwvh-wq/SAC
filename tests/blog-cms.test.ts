import assert from "node:assert/strict";
import test from "node:test";
import { formatNepalDateTimeInput, parseNepalDateTimeInput } from "../lib/blog/dates";
import { estimateReadingTime } from "../lib/blog/reading-time";
import { createBlogSlug } from "../lib/blog/slug";
import { blogPostInputSchema, isBlogPostPublic, parseBlogPostInput } from "../lib/blog/validation";

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
});

test("converts Nepal date-time input independently of server timezone", () => {
  const date = parseNepalDateTimeInput("2026-07-18T16:32");
  assert.equal(date?.toISOString(), "2026-07-18T10:47:00.000Z");
  assert.equal(formatNepalDateTimeInput(date), "2026-07-18T16:32");
  assert.equal(parseNepalDateTimeInput("2026-02-30T10:00"), null);
});
