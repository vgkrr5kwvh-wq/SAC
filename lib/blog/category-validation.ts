import { z } from "zod";
import { createBlogSlug } from "./slug";

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: z.string().transform(createBlogSlug).pipe(z.string().min(1, "Slug is required.").max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
  description: z.preprocess((value) => typeof value === "string" && value.trim() ? value.trim() : undefined, z.string().max(500).optional()),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(-10000).max(10000),
});

export function parseCategoryIds(values: FormDataEntryValue[]): string[] {
  const ids = [...new Set(values.map(String))];
  if (ids.some((id) => !/^c[a-z0-9]{20,29}$/.test(id))) throw new Error("Invalid category selection.");
  return ids;
}

export function canDeleteCategory(usageCount: number): boolean {
  return Number.isInteger(usageCount) && usageCount === 0;
}

export function isCategoryId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{20,29}$/.test(value);
}

export function buildCategorySeo(category: { name: string; slug: string; description: string | null }, page = 1) {
  const description = (category.description || `Read ${category.name} articles from Self Apply Center.`).slice(0, 160);
  const base = `/blog/category/${category.slug}`;
  return { title: category.name, description, canonical: page > 1 ? `${base}?page=${page}` : base };
}
