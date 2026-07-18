import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BlogCard from "@/components/blog/blog-card";
import { blogPageSize, parseBlogPage } from "@/lib/blog/params";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Study Abroad Blog", description: "Practical study-abroad application, destination, document, and visa guidance from Self Apply Center.", alternates: { canonical: "/blog" } };

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = parseBlogPage((await searchParams).page);
  const now = new Date();
  const where = { status: "PUBLISHED" as const, publishedAt: { not: null, lte: now } };
  const [total, posts] = await prisma.$transaction([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({ where, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { id: "desc" }], skip: (page - 1) * blogPageSize, take: blogPageSize, select: { slug: true, title: true, excerpt: true, content: true, coverImageUrl: true, featured: true, publishedAt: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / blogPageSize));
  if (page > totalPages) redirect(`/blog${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  return <main><section className="inner-hero"><div className="shell inner-hero-grid"><div><span className="eyebrow">Student Resources</span><h1>Straightforward guidance for studying abroad.</h1><p>Practical articles for applications, destinations, documents, and student planning.</p></div><div className="breadcrumb"><Link href="/">Home</Link><span>→</span><strong>Blog</strong></div></div></section><section className="section blog-index"><div className="shell">{posts.length ? <div className="blog-grid">{posts.map((post) => post.publishedAt ? <BlogCard key={post.slug} post={{ ...post, publishedAt: post.publishedAt }}/> : null)}</div> : <div className="cms-blog-empty"><h2>No articles published yet.</h2><p>Please check back for new study-abroad guidance.</p></div>} {totalPages > 1 ? <nav className="public-blog-pagination" aria-label="Blog pagination">{page > 1 ? <Link href={`/blog?page=${page - 1}`}>Previous</Link> : <span aria-disabled="true">Previous</span>}<span aria-current="page">Page {page} of {totalPages}</span>{page < totalPages ? <Link href={`/blog?page=${page + 1}`}>Next</Link> : <span aria-disabled="true">Next</span>}</nav> : null}</div></section></main>;
}
