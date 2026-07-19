"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { auth } from "@/auth";
import { parseCategoryIds } from "@/lib/blog/category-validation";
import { isBlogPostId } from "@/lib/blog/id";
import { parseBlogPostInput, resolveBlogPublishedAt } from "@/lib/blog/validation";
import { prisma } from "@/lib/prisma";

export type BlogFormState = {
  status: "idle" | "error";
  message: string;
  errors: Record<string, string[]>;
  values: Record<string, string>;
};

export const initialBlogFormState: BlogFormState = {
  status: "idle",
  message: "",
  errors: {},
  values: {},
};

class InvalidCategorySelectionError extends Error {}
class DuplicateBlogSlugError extends Error {}

function formValues(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    ["title", "slug", "excerpt", "content", "coverImageUrl", "status", "seoTitle", "metaDescription", "publishedAt"]
      .map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

export async function saveBlogPostAction(
  postId: string | null,
  _previousState: BlogFormState,
  formData: FormData,
): Promise<BlogFormState> {
  const values = formValues(formData);
  const failure = (message: string, errors: Record<string, string[]> = {}): BlogFormState => ({
    status: "error",
    message,
    errors,
    values: { ...values, featured: formData.get("featured") === "on" ? "true" : "", categoryIds: formData.getAll("categoryIds").map(String).join(",") },
  });

  const session = await auth();
  if (!session?.user) return failure("Unable to save blog post.");
  if (postId && !isBlogPostId(postId)) return failure("Unable to save blog post.");

  let input;
  let categoryIds: string[];
  try {
    input = parseBlogPostInput({
      ...values,
      featured: formData.get("featured") === "on",
    });
    categoryIds = parseCategoryIds(formData.getAll("categoryIds"));
  } catch (error) {
    if (error instanceof ZodError) {
      const flattened = error.flatten();
      return failure("Please correct the highlighted fields.", flattened.fieldErrors);
    }
    return failure("Please correct the highlighted fields.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = postId ? await transaction.blogPost.findUnique({
        where: { id: postId },
        select: { slug: true, status: true, publishedAt: true, categories: { select: { id: true, slug: true } } },
      }) : null;
      if (postId && !existing) throw new Error("Missing blog post");

      const conflict = await transaction.blogPost.findFirst({
        where: { slug: input.slug, ...(postId ? { NOT: { id: postId } } : {}) },
        select: { id: true },
      });
      if (conflict) throw new DuplicateBlogSlugError();

      const existingCategoryIds = existing?.categories.map((category) => category.id) ?? [];
      const validCategories = categoryIds.length ? await transaction.category.findMany({
        where: { id: { in: categoryIds }, OR: [{ isActive: true }, { id: { in: existingCategoryIds } }] },
        select: { id: true, slug: true },
      }) : [];
      if (validCategories.length !== categoryIds.length) throw new InvalidCategorySelectionError();

      const data = {
        ...input,
        publishedAt: resolveBlogPublishedAt({
          nextStatus: input.status,
          submittedPublishedAt: input.status === "DRAFT" && !input.publishedAt
            ? existing?.publishedAt ?? null
            : input.publishedAt,
          existingStatus: existing?.status,
          existingPublishedAt: existing?.publishedAt,
        }),
      };
      const post = postId
        ? await transaction.blogPost.update({ where: { id: postId }, data: { ...data, categories: { set: categoryIds.map((id) => ({ id })) } }, select: { id: true, slug: true } })
        : await transaction.blogPost.create({ data: { ...data, categories: { connect: categoryIds.map((id) => ({ id })) } }, select: { id: true, slug: true } });
      return { post, existingSlug: existing?.slug, oldCategorySlugs: existing?.categories.map((category) => category.slug) ?? [], newCategorySlugs: validCategories.map((category) => category.slug) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    revalidatePath(`/blog/${result.post.slug}`);
    if (result.existingSlug && result.existingSlug !== result.post.slug) revalidatePath(`/blog/${result.existingSlug}`);
    for (const slug of new Set([...result.oldCategorySlugs, ...result.newCategorySlugs])) revalidatePath(`/blog/category/${slug}`);
    redirect(`/admin/blog/${result.post.id}/edit?saved=1`);
  } catch (error) {
    if (error instanceof InvalidCategorySelectionError) return failure("Please correct the highlighted fields.", { categoryIds: ["Select valid active categories."] });
    if (error instanceof DuplicateBlogSlugError) return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });
    }
    if (error && typeof error === "object" && "digest" in error) throw error;
    return failure("Unable to save blog post.");
  }
}
