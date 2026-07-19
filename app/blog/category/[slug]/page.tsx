import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BlogCard from "@/components/blog/blog-card";
import { buildCategorySeo } from "@/lib/blog/category-validation";
import { blogPageSize, parseBlogPage } from "@/lib/blog/params";
import { getPublicCategory, getPublicCategoryPage } from "@/lib/blog/queries";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> }): Promise<Metadata> {
  const category = await getPublicCategory((await params).slug);
  if (!category) notFound();
  const seo = buildCategorySeo(category, parseBlogPage((await searchParams).page));
  return { title: seo.title, description: seo.description, alternates: { canonical: seo.canonical }, openGraph: { title: seo.title, description: seo.description, url: seo.canonical, images: [{ url: "/og.png", alt: "Self Apply Center study-abroad guidance" }] }, twitter: { card: "summary_large_image", title: seo.title, description: seo.description, images: ["/og.png"] } };
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string | string[] }> }) {
  const { slug } = await params;
  const page = parseBlogPage((await searchParams).page);
  let result;
  try {
    result = await getPublicCategoryPage(slug, page, blogPageSize);
  } catch {
    return <main><section className="section"><div className="shell cms-blog-empty" role="alert"><h1>Unable to load this blog category.</h1><p>Please try again in a moment.</p></div></section></main>;
  }
  if (!result) notFound();
  const totalPages = Math.max(1, Math.ceil(result.total / blogPageSize));
  if (page > totalPages) redirect(`/blog/category/${result.category.slug}${totalPages > 1 ? `?page=${totalPages}` : ""}`);
  const seo = buildCategorySeo(result.category, page);
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: result.category.name, url: `https://selfapplycenter.com${seo.canonical}` };
  return <main><section className="inner-hero"><div className="shell"><div className="breadcrumb"><Link href="/blog">Blog</Link><span>→</span><strong>{result.category.name}</strong></div><h1>{result.category.name}</h1>{result.category.description ? <p>{result.category.description}</p> : null}</div></section><section className="section blog-index"><div className="shell">{result.posts.length ? <div className="blog-grid">{result.posts.map((post) => post.publishedAt ? <BlogCard key={post.slug} post={{ ...post, publishedAt: post.publishedAt }}/> : null)}</div> : <div className="cms-blog-empty"><h2>No published articles in this category.</h2></div>}{totalPages > 1 ? <nav className="public-blog-pagination" aria-label="Category pagination">{page > 1 ? <Link href={`/blog/category/${result.category.slug}?page=${page - 1}`} aria-label="Previous category page">Previous</Link> : <span aria-disabled="true">Previous</span>}<span aria-current="page">Page {page} of {totalPages}</span>{page < totalPages ? <Link href={`/blog/category/${result.category.slug}?page=${page + 1}`} aria-label="Next category page">Next</Link> : <span aria-disabled="true">Next</span>}</nav> : null}</div></section><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}/></main>;
}
