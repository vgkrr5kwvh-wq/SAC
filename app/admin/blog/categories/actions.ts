"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canDeleteCategory, categoryInputSchema } from "@/lib/blog/category-validation";
import { prisma } from "@/lib/prisma";

export type CategoryFormState = { message: string; errors: Record<string, string[]> };

export async function saveCategoryAction(id: string | null, _state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  if (!(await auth())?.user) return { message: "Unable to save category.", errors: {} };
  const parsed = categoryInputSchema.safeParse({ name: formData.get("name"), slug: formData.get("slug"), description: formData.get("description"), isActive: formData.get("isActive") === "on", sortOrder: formData.get("sortOrder") });
  if (!parsed.success) return { message: "Please correct the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  try {
    const conflict = await prisma.category.findFirst({ where: { slug: parsed.data.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (conflict) return { message: "Please correct the highlighted fields.", errors: { slug: ["This slug is already in use."] } };
    const category = id
      ? await prisma.category.update({ where: { id }, data: parsed.data, select: { slug: true } })
      : await prisma.category.create({ data: parsed.data, select: { slug: true } });
    revalidatePath("/admin/blog/categories"); revalidatePath("/admin/blog"); revalidatePath("/blog"); revalidatePath(`/blog/category/${category.slug}`);
    redirect("/admin/blog/categories?saved=1");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { message: "Please correct the highlighted fields.", errors: { slug: ["This slug is already in use."] } };
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { message: "Unable to save category.", errors: {} };
  }
}

export async function deleteCategoryAction(id: string): Promise<void> {
  if (!(await auth())?.user) return;
  try {
    const category = await prisma.category.findUnique({ where: { id }, select: { slug: true, _count: { select: { posts: true } } } });
    if (!category || !canDeleteCategory(category._count.posts)) redirect("/admin/blog/categories?delete=used");
    await prisma.category.delete({ where: { id } });
    revalidatePath("/admin/blog/categories"); revalidatePath("/admin/blog"); revalidatePath("/blog"); revalidatePath(`/blog/category/${category.slug}`);
    redirect("/admin/blog/categories?deleted=1");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect("/admin/blog/categories?delete=failed");
  }
}
