import type { Metadata } from "next";
import Link from "next/link";
import BlogPostForm, { type BlogFormValues } from "@/components/admin/blog-post-form";

export const metadata: Metadata = { title: "New blog post", robots: { index: false, follow: false } };
const emptyPost: BlogFormValues = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "", status: "DRAFT", featured: false, seoTitle: "", metaDescription: "", publishedAt: "" };

export default function NewBlogPostPage() {
  return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>New blog post</h1><p>Draft or publish a Markdown article.</p></div><Link className="admin-back-link" href="/admin/blog">Back to blog list</Link></header><BlogPostForm postId={null} initialValues={emptyPost}/></div>;
}
