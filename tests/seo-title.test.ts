import assert from "node:assert/strict";
import test from "node:test";
import { buildBlogPostMetadata } from "../app/blog/[postSlug]/page";
import { buildBrandedTitle } from "../lib/seo/title";

test("ensures SEO titles contain exactly one trailing brand suffix", () => {
  assert.equal(buildBrandedTitle("Study in Canada"), "Study in Canada | Self Apply Center");
  assert.equal(buildBrandedTitle("Study in Canada | Self Apply Center"), "Study in Canada | Self Apply Center");
  assert.equal(buildBrandedTitle("IELTS Guide | Self Apply Center | Self Apply Center"), "IELTS Guide | Self Apply Center");
  assert.equal(buildBrandedTitle("IELTS Guide  |  Self Apply Center   "), "IELTS Guide | Self Apply Center");
  assert.equal(buildBrandedTitle("IELTS Guide | self apply CENTER"), "IELTS Guide | Self Apply Center");
  assert.equal(buildBrandedTitle("Why Choose Self Apply Center for USA Applications"), "Why Choose Self Apply Center for USA Applications | Self Apply Center");
  assert.equal(buildBrandedTitle("Study in USA | F-1 Visa Guide"), "Study in USA | F-1 Visa Guide | Self Apply Center");
  assert.equal(buildBrandedTitle("Self Apply Center | USA Applications"), "Self Apply Center | USA Applications | Self Apply Center");
});

const basePost = {
  title: "Fallback Article Title",
  slug: "fallback-article",
  excerpt: "Fallback excerpt",
  coverImageUrl: null,
  seoTitle: null,
  metaDescription: "Preserved meta description",
  publishedAt: new Date("2026-07-01T06:15:00.000Z"),
  updatedAt: new Date("2026-07-02T06:15:00.000Z"),
};

test("builds blog metadata from title fallback without changing existing SEO fields", () => {
  const metadata = buildBlogPostMetadata(basePost);
  assert.deepEqual(metadata.title, { absolute: "Fallback Article Title | Self Apply Center" });
  assert.equal(metadata.alternates?.canonical, "/blog/fallback-article");
  assert.equal(metadata.description, "Preserved meta description");
  assert.equal(metadata.openGraph?.title, "Fallback Article Title");
  assert.equal(metadata.twitter?.title, "Fallback Article Title");
});

test("brands unbranded SEO titles once while preserving current social titles", () => {
  const metadata = buildBlogPostMetadata({ ...basePost, seoTitle: "Focused SEO Title" });
  assert.deepEqual(metadata.title, { absolute: "Focused SEO Title | Self Apply Center" });
  assert.equal(metadata.openGraph?.title, "Focused SEO Title");
  assert.equal(metadata.twitter?.title, "Focused SEO Title");
});

test("does not duplicate pre-branded SEO titles", () => {
  const metadata = buildBlogPostMetadata({ ...basePost, seoTitle: "Focused SEO Title | Self Apply Center" });
  assert.deepEqual(metadata.title, { absolute: "Focused SEO Title | Self Apply Center" });
  assert.equal(metadata.openGraph?.title, "Focused SEO Title | Self Apply Center");
  assert.equal(metadata.twitter?.title, "Focused SEO Title | Self Apply Center");
});

test("collapses repeated suffixes in document and social titles", () => {
  const metadata = buildBlogPostMetadata({ ...basePost, seoTitle: "Focused SEO Title | Self Apply Center | Self Apply Center" });
  assert.deepEqual(metadata.title, { absolute: "Focused SEO Title | Self Apply Center" });
  assert.equal(metadata.openGraph?.title, "Focused SEO Title | Self Apply Center");
  assert.equal(metadata.twitter?.title, "Focused SEO Title | Self Apply Center");
});
