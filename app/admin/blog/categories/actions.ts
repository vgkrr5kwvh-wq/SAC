"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canDeleteCategory, categoryInputSchema, isCategoryId } from "@/lib/blog/category-validation";
import { prisma } from "@/lib/prisma";

export type CategoryFormState = { message: string; errors: Record<string, string[]>; values: Record<string, string> };
class DuplicateCategorySlugError extends Error {}

export async function saveCategoryAction(id: string | null, _state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  const values = {
    name: String(formData.get("name") ?? ""), slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""), sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on" ? "true" : "false",
  };
  const failure = (message: string, errors: Record<string, string[]> = {}): CategoryFormState => ({ message, errors, values });
  if (!(await auth())?.user) return failure("Unable to save category.");
  if (id && !isCategoryId(id)) return failure("Unable to save category.");
  const parsed = categoryInputSchema.safeParse({ name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description"), isActive: formData.get("isActive") === "on", sortOrder: formData.get("sortOrder") });
  if (!parsed.success) return failure("Please correct the highlighted fields.", parsed.error.flatten().fieldErrors);
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existing = id ? await transaction.category.findUnique({ where: { id }, select: { slug: true } }) : null;
      if (id && !existing) throw new Error("Missing category");
      const conflict = await transaction.category.findFirst({ where: { slug: parsed.data.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
      if (conflict) throw new DuplicateCategorySlugError();
      const category = id
        ? await transaction.category.update({ where: { id }, data: parsed.data, select: { slug: true } })
        : await transaction.category.create({ data: parsed.data, select: { slug: true } });
      return { category, oldSlug: existing?.slug };
    });
    revalidatePath("/admin/blog/categories"); revalidatePath("/admin/blog"); revalidatePath("/blog"); revalidatePath(`/blog/category/${result.category.slug}`);
    if (result.oldSlug && result.oldSlug !== result.category.slug) revalidatePath(`/blog/category/${result.oldSlug}`);
    revalidatePath("/blog/[postSlug]", "page");
    revalidatePath("/sitemap.xml");
    redirect("/admin/blog/categories?saved=1");
  } catch (error) {
    if (error instanceof DuplicateCategorySlugError) return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return failure("Please correct the highlighted fields.", { slug: ["This slug is already in use."] });
    if (error && typeof error === "object" && "digest" in error) throw error;
    return failure("Unable to save category.");
  }
}

export async function deleteCategoryAction(id: string): Promise<void> {
  if (!(await auth())?.user) redirect("/login?callbackUrl=/admin/blog/categories");
  if (!isCategoryId(id)) redirect("/admin/blog/categories?delete=failed");
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findUnique({ where: { id }, select: { slug: true, _count: { select: { posts: true } } } });
      if (!category) return { status: "missing" as const };
      if (!canDeleteCategory(category._count.posts)) return { status: "used" as const };
      await transaction.category.delete({ where: { id } });
      return { status: "deleted" as const, slug: category.slug };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.status === "used") redirect("/admin/blog/categories?delete=used");
    if (result.status === "missing") redirect("/admin/blog/categories?delete=failed");
    revalidatePath("/admin/blog/categories"); revalidatePath("/admin/blog"); revalidatePath("/blog"); revalidatePath(`/blog/category/${result.slug}`); revalidatePath("/sitemap.xml");
    redirect("/admin/blog/categories?deleted=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/admin/blog/categories?delete=failed");
  }
}
