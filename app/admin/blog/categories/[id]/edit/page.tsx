import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryForm from "@/components/admin/category-form";
import { isCategoryId } from "@/lib/blog/category-validation";
import { prisma } from "@/lib/prisma";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCategoryId(id)) notFound();
  let category;
  try {
    category = await prisma.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true, description: true, isActive: true, sortOrder: true } });
  } catch {
    return <section className="admin-error" role="alert"><h1>Unable to load category.</h1><p>Please try again in a moment.</p></section>;
  }
  if (!category) notFound();
  return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>Edit category</h1></div><Link className="admin-back-link" href="/admin/blog/categories">Back to categories</Link></header><CategoryForm id={category.id} values={{ ...category, description: category.description ?? "" }}/></div>;
}
