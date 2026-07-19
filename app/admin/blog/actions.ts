"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { auth } from "@/auth";
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
    values: { ...values, featured: formData.get("featured") === "on" ? "true" : "" },
  });

  const session = await auth();
  if (!session?.user) return failure("Unable to save blog post.");

  let input;
  try {
    input = parseBlogPostInput({
      ...values,
      featured: formData.get("featured") === "on",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const flattened = error.flatten();
      return failure("Please correct the highlighted fields.", flattened.fieldErrors);
    }
    return failure("Please correct the highlighted fields.");
  }

  try {
    const existing = postId ? await prisma.blogPost.findUnique({
      where: { id: postId },
      select: { slug: true, status: true, publishedAt: true },
    }) : null;
    if (postId && !existing) return failure("Unable to save blog post.");

    const conflict = await prisma.blogPost.findFirst({
      where: { slug: input.slug, ...(postId ? { NOT: { id: postId } } : {}) },
      select: { id: true },
    });
    if (conflict) return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });

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
      ? await prisma.blogPost.update({ where: { id: postId }, data, select: { id: true, slug: true } })
      : await prisma.blogPost.create({ data, select: { id: true, slug: true } });

    revalidatePath("/admin/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    if (existing?.slug && existing.slug !== post.slug) revalidatePath(`/blog/${existing.slug}`);
    redirect(`/admin/blog/${post.id}/edit?saved=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });
    }
    if (error && typeof error === "object" && "digest" in error) throw error;
    return failure("Unable to save blog post.");
  }
}
