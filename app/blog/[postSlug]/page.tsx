/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownContent from "@/components/blog/markdown-content";
import { blogDateFormatter } from "@/lib/blog/dates";
import { formatReadingTime } from "@/lib/blog/reading-time";
import { prisma } from "@/lib/prisma";

const siteUrl = "https://selfapplycenter.com";
const publicSelect = { title: true, slug: true, excerpt: true, content: true, coverImageUrl: true, seoTitle: true, metaDescription: true, publishedAt: true, updatedAt: true } as const;

async function findPublicPost(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 220) return null;
  return prisma.blogPost.findFirst({ where: { slug, status: "PUBLISHED", publishedAt: { not: null, lte: new Date() } }, select: publicSelect });
}

export async function generateMetadata({ params }: { params: Promise<{ postSlug: string }> }): Promise<Metadata> {
  const post = await findPublicPost((await params).postSlug);
  if (!post?.publishedAt) notFound();
  const title = post.seoTitle || post.title;
  const description = post.metaDescription || post.excerpt || undefined;
  const canonical = `/blog/${post.slug}`;
  return { title, description, alternates: { canonical }, robots: { index: true, follow: true }, openGraph: { type: "article", title, description, url: canonical, publishedTime: post.publishedAt.toISOString(), modifiedTime: post.updatedAt.toISOString(), images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.title }] : undefined } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ postSlug: string }> }) {
  const post = await findPublicPost((await params).postSlug);
  if (!post?.publishedAt) notFound();
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;
  const description = post.metaDescription || post.excerpt || undefined;
  const structuredData = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, ...(description ? { description } : {}), ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}), datePublished: post.publishedAt.toISOString(), dateModified: post.updatedAt.toISOString(), mainEntityOfPage: canonicalUrl, publisher: { "@type": "Organization", name: "Self Apply Center", url: siteUrl, logo: { "@type": "ImageObject", url: `${siteUrl}/sac-logo.png` } } };
  return <main><article className="blog-post cms-blog-post"><header className="blog-post-header"><div className="shell"><div className="breadcrumb"><Link href="/">Home</Link><span>→</span><Link href="/blog">Blog</Link></div><span className="eyebrow">Student Resources</span><h1>{post.title}</h1>{post.excerpt ? <p>{post.excerpt}</p> : null}<div className="blog-meta"><time dateTime={post.publishedAt.toISOString()}>{blogDateFormatter.format(post.publishedAt)}</time><span>{formatReadingTime(post.content)}</span></div></div></header>{post.coverImageUrl ? <div className="shell cms-blog-hero"><img src={post.coverImageUrl} alt={`Cover for ${post.title}`} /></div> : null}<div className="shell blog-post-body"><MarkdownContent content={post.content}/><div className="blog-post-cta"><h2>Want advice for your own profile?</h2><p>Talk to SAC for a practical application plan based on your goals.</p><Link className="button primary" href="/contact">Contact a counsellor →</Link></div></div><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/></article></main>;
}
