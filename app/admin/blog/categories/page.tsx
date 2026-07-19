import Link from "next/link";
import CategoryForm from "@/components/admin/category-form";
import { prisma } from "@/lib/prisma";
import { deleteCategoryAction } from "./actions";

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const notice = await searchParams;
  let categories;
  try { categories = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }], select: { id: true, name: true, slug: true, isActive: true, sortOrder: true, _count: { select: { posts: true } } } }); }
  catch { return <section className="admin-error" role="alert"><h1>Unable to load categories.</h1></section>; }
  return <div className="admin-blog-page"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>Categories</h1><p>Organize blog posts into public topics.</p></div><Link className="admin-back-link" href="/admin/blog">Back to blog</Link></header>{notice.saved ? <p role="status">Category saved.</p> : null}{notice.delete === "used" ? <p role="alert">This category cannot be deleted while it is assigned to blog posts.</p> : null}<section className="admin-table-card"><div className="admin-table-heading"><h2>Existing categories</h2></div><div className="admin-table-scroll"><table><thead><tr><th scope="col">Name</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col">Order</th><th scope="col">Posts</th><th scope="col">Actions</th></tr></thead><tbody>{categories.length ? categories.map((category) => <tr key={category.id}><td>{category.name}</td><td>{category.slug}</td><td>{category.isActive ? "Active" : "Inactive"}</td><td>{category.sortOrder}</td><td>{category._count.posts}</td><td><Link href={`/admin/blog/categories/${category.id}/edit`}>Edit</Link> <form action={deleteCategoryAction.bind(null, category.id)} className="admin-inline-form"><button type="submit" disabled={category._count.posts > 0}>Delete</button></form></td></tr>) : <tr><td colSpan={6}>No categories yet.</td></tr>}</tbody></table></div></section><section className="admin-table-card"><div className="admin-table-heading"><h2>Create category</h2></div><CategoryForm/></section></div>;
}
