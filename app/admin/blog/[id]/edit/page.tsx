import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPostForm from "@/components/admin/blog-post-form";
import { formatNepalDateTimeInput } from "@/lib/blog/dates";
import { isBlogPostId } from "@/lib/blog/id";
import { isBlogPostPublic } from "@/lib/blog/validation";
import { prisma } from "@/lib/prisma";
import { deleteBlogPostAction } from "../../actions";

export const metadata: Metadata = { title: "Edit blog post", robots: { index: false, follow: false } };

export default async function EditBlogPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  if (!isBlogPostId(id)) notFound();
  let post;
  let categories;
  let media;
  try {
    [post, categories, media] = await Promise.all([
      prisma.blogPost.findUnique({ where: { id }, select: { id: true, title: true, slug: true, excerpt: true, content: true, coverImageUrl: true, status: true, featured: true, seoTitle: true, metaDescription: true, publishedAt: true, categories: { select: { id: true } } } }),
      prisma.category.findMany({ where: { OR: [{ isActive: true }, { posts: { some: { id } } }] }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } }),
      prisma.mediaAsset.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { id: true, originalName: true, secureUrl: true, url: true, altText: true, width: true, height: true } }),
    ]);
  } catch {
    return <section className="admin-error" role="alert"><h1>Unable to load blog post.</h1></section>;
  }
  if (!post) notFound();
  const saved = (await searchParams).saved === "1";
  return <div className="admin-blog-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Blog CMS</span><h1>Edit blog post</h1><p>Update content, publication, and search metadata.</p></div><div className="admin-heading-actions"><Link className="admin-back-link" href="/admin/blog">Back to blog list</Link>{isBlogPostPublic(post) ? <Link className="button secondary" href={`/blog/${post.slug}`}>View public post</Link> : null}</div></header>{saved ? <p className="admin-profile-message is-success" role="status">Blog post saved successfully.</p> : null}<BlogPostForm postId={post.id} initialValues={{ title: post.title, slug: post.slug, excerpt: post.excerpt ?? "", content: post.content, coverImageUrl: post.coverImageUrl ?? "", status: post.status, featured: post.featured, seoTitle: post.seoTitle ?? "", metaDescription: post.metaDescription ?? "", publishedAt: formatNepalDateTimeInput(post.publishedAt) }} categories={categories} selectedCategoryIds={post.categories.map((category) => category.id)} media={media.map(({ secureUrl, url, ...asset }) => ({ ...asset, url: secureUrl ?? url }))}/><section className="admin-table-card admin-media-danger"><div><h2>Delete blog post</h2><p>This permanently removes the post from the CMS and public website.</p></div><form action={deleteBlogPostAction.bind(null, post.id)}><button className="button secondary" type="submit">Delete post</button></form></section></div>;
}
