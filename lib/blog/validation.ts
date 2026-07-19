import { z } from "zod";
import { parseNepalDateTimeInput } from "./dates";
import { createBlogSlug } from "./slug";

const optionalText = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().max(maximum).optional(),
);

const coverUrlSchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : undefined,
  z.string().url().max(2048).refine(
    (value) => /^https?:\/\//i.test(value) && URL.canParse(value),
    "Cover image must use http or https.",
  ).optional(),
);

export const blogPostInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: z.string().transform(createBlogSlug).pipe(
    z.string().min(1, "Slug is required.").max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Enter a valid slug."),
  ),
  excerpt: optionalText(500),
  content: z.string().trim().min(1, "Content is required."),
  coverImageUrl: coverUrlSchema,
  status: z.enum(["DRAFT", "PUBLISHED"]),
  featured: z.boolean(),
  seoTitle: optionalText(70),
  metaDescription: optionalText(160),
  publishedAt: z.string().trim().optional(),
});

export type BlogPostInput = Omit<z.infer<typeof blogPostInputSchema>, "publishedAt"> & {
  publishedAt: Date | null;
};

export function parseBlogPostInput(values: Record<string, unknown>, now = new Date()): BlogPostInput {
  const parsed = blogPostInputSchema.parse(values);
  let publishedAt: Date | null = null;
  if (parsed.publishedAt) {
    publishedAt = parseNepalDateTimeInput(parsed.publishedAt);
    if (!publishedAt) throw new z.ZodError([{ code: "custom", path: ["publishedAt"], message: "Enter a valid Nepal date and time." }]);
  }
  if (parsed.status === "PUBLISHED" && !publishedAt) publishedAt = now;
  return { ...parsed, publishedAt };
}

export function isBlogPostPublic(post: { status: string; publishedAt: Date | null }, now = new Date()): boolean {
  return post.status === "PUBLISHED" && Boolean(post.publishedAt && post.publishedAt <= now);
}

export function resolveBlogPublishedAt({
  nextStatus,
  submittedPublishedAt,
  existingStatus,
  existingPublishedAt,
}: {
  nextStatus: "DRAFT" | "PUBLISHED";
  submittedPublishedAt: Date | null;
  existingStatus?: "DRAFT" | "PUBLISHED";
  existingPublishedAt?: Date | null;
}): Date | null {
  if (existingStatus === "PUBLISHED" && nextStatus === "DRAFT") {
    return existingPublishedAt ?? null;
  }
  return submittedPublishedAt;
}
