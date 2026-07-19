/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { blogDateFormatter } from "@/lib/blog/dates";
import { formatReadingTime } from "@/lib/blog/reading-time";

export default function BlogCard({ post }: { post: { slug: string; title: string; excerpt: string | null; content: string; coverImageUrl: string | null; featured: boolean; publishedAt: Date; categories: Array<{ name: string; slug: string }> } }) {
  return <article className={`blog-card cms-blog-card${post.featured ? " featured" : ""}`}>
    {post.coverImageUrl ? <div className="cms-blog-cover"><img src={post.coverImageUrl} alt={`Cover for ${post.title}`} loading="lazy" /></div> : <div className="cms-blog-cover is-placeholder" aria-hidden="true">SAC</div>}
    <div className="blog-card-copy"><div className="blog-card-topline"><div className="blog-meta"><time dateTime={post.publishedAt.toISOString()}>{blogDateFormatter.format(post.publishedAt)}</time><span>{formatReadingTime(post.content)}</span>{post.featured ? <strong>Featured</strong> : null}</div></div>{post.categories.length ? <div className="blog-category-badges">{post.categories.map((category) => <Link key={category.slug} href={`/blog/category/${category.slug}`}>{category.name}</Link>)}</div> : null}<h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>{post.excerpt ? <p>{post.excerpt}</p> : null}<Link className="text-action" href={`/blog/${post.slug}`}>Read article →</Link></div>
  </article>;
}
