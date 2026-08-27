import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BlogCard from "@/components/blog/blog-card";
import { blogPageSize, parseBlogPage } from "@/lib/blog/params";
import { getPublicBlogPage } from "@/lib/blog/queries";

const title = "Study Abroad Blog";
const description = "Practical study-abroad application, destination, document, and visa guidance from Self Apply Center.";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }): Promise<Metadata> {
  const page = parseBlogPage((await searchParams).page);
  const canonical = page > 1 ? `/blog?page=${page}` : "/blog";
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, images: [{ url: "/og.png", alt: "Self Apply Center study-abroad guidance" }] }, twitter: { card: "summary_large_image", title, description, images: ["/og.png"] } };
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = parseBlogPage((await searchParams).page);
  let result;
  try {
    result = await getPublicBlogPage(page, blogPageSize);
  } catch {
    return <main><section className="section"><div className="shell cms-blog-empty" role="alert"><h1>Unable to load the blog.</h1><p>Please try again in a moment.</p></div></section></main>;
  }
  const { total, posts } = result;
  const totalPages = Math.max(1, Math.ceil(total / blogPageSize));
  if (page > totalPages) redirect(`/blog${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  return <main><section className="inner-hero"><div className="shell inner-hero-grid"><div><span className="eyebrow">Student Resources</span><h1>Straightforward guidance for studying abroad.</h1><p>Practical articles for applications, destinations, documents, and student planning.</p></div><div className="breadcrumb"><Link href="/">Home</Link><span>→</span><strong>Blog</strong></div></div></section><section className="section blog-index"><div className="shell">{posts.length ? <div className="blog-grid">{posts.map((post) => post.publishedAt ? <BlogCard key={post.slug} post={{ ...post, publishedAt: post.publishedAt }}/> : null)}</div> : <div className="cms-blog-empty"><h2>No articles published yet.</h2><p>Please check back for new study-abroad guidance.</p></div>} {totalPages > 1 ? <nav className="public-blog-pagination" aria-label="Blog pagination">{page > 1 ? <Link href={`/blog?page=${page - 1}`} aria-label="Previous blog page">Previous</Link> : <span aria-disabled="true">Previous</span>}<span aria-current="page">Page {page} of {totalPages}</span>{page < totalPages ? <Link href={`/blog?page=${page + 1}`} aria-label="Next blog page">Next</Link> : <span aria-disabled="true">Next</span>}</nav> : null}</div></section></main>;
}
