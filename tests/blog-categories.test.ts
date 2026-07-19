import assert from "node:assert/strict";
import test from "node:test";
import { buildCategorySeo, canDeleteCategory, categoryInputSchema, parseCategoryIds } from "../lib/blog/category-validation";

test("validates category create and edit input", () => {
  const result = categoryInputSchema.parse({ name: " Study Guides ", slug: "Study Guides!!!", description: " Guidance ", isActive: true, sortOrder: "2" });
  assert.deepEqual(result, { name: "Study Guides", slug: "study-guides", description: "Guidance", isActive: true, sortOrder: 2 });
  assert.equal(categoryInputSchema.safeParse({ name: "", slug: "!!!", isActive: true, sortOrder: 0 }).success, false);
});

test("normalizes duplicate category slugs consistently", () => {
  const first = categoryInputSchema.parse({ name: "Visa", slug: "Visa Updates", isActive: true, sortOrder: 0 });
  const second = categoryInputSchema.parse({ name: "Other", slug: " visa---updates ", isActive: true, sortOrder: 1 });
  assert.equal(first.slug, second.slug);
});

test("protects used categories from deletion", () => {
  assert.equal(canDeleteCategory(0), true);
  assert.equal(canDeleteCategory(1), false);
});

test("validates and deduplicates category assignments", () => {
  const id = "c12345678901234567890";
  assert.deepEqual(parseCategoryIds([id, id]), [id]);
  assert.throws(() => parseCategoryIds(["invalid"]), /Invalid category/);
});

test("builds category metadata with canonical and fallback", () => {
  assert.deepEqual(buildCategorySeo({ name: "Study Guides", slug: "study-guides", description: null }), { title: "Study Guides", description: "Read Study Guides articles from Self Apply Center.", canonical: "/blog/category/study-guides" });
  assert.equal(buildCategorySeo({ name: "Study Guides", slug: "study-guides", description: null }, 2).canonical, "/blog/category/study-guides?page=2");
});
