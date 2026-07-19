import Link from "next/link";
import { notFound } from "next/navigation";
import CategoryForm from "@/components/admin/category-form";
import { prisma } from "@/lib/prisma";
export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!/^c[a-z0-9]{20,29}$/.test(id)) notFound(); const category = await prisma.category.findUnique({ where: { id }, select: { id: true, name: true, slug: true, description: true, isActive: true, sortOrder: true } }); if (!category) notFound(); return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>Edit category</h1></div><Link href="/admin/blog/categories">Back to categories</Link></header><CategoryForm id={category.id} values={{ ...category, description: category.description ?? "" }}/></div>; }
