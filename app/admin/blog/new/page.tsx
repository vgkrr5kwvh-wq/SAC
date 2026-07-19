import type { Metadata } from "next";
import Link from "next/link";
import BlogPostForm, { type BlogFormValues } from "@/components/admin/blog-post-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "New blog post", robots: { index: false, follow: false } };
const emptyPost: BlogFormValues = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", status: "DRAFT", featured: false, seoTitle: "", metaDescription: "", publishedAt: "" };

export default async function NewBlogPostPage() {
  let categories;
  try {
    categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } });
  } catch {
    return <section className="admin-error" role="alert"><h1>Unable to load the blog editor.</h1><p>Please try again in a moment.</p></section>;
  }
  return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>New blog post</h1><p>Draft or publish a Markdown article.</p></div><Link className="admin-back-link" href="/admin/blog">Back to blog list</Link></header><BlogPostForm postId={null} initialValues={emptyPost} categories={categories}/></div>;
}
