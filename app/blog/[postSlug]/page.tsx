import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPostMap, blogPosts } from "../../blog-posts";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ postSlug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ postSlug: string }> }): Promise<Metadata> {
  const post = blogPostMap[(await params).postSlug];
  return post ? { title: post.title, description: post.excerpt } : {};
}

export default async function BlogPostPage({ params }: { params: Promise<{ postSlug: string }> }) {
  const post = blogPostMap[(await params).postSlug];
  if (!post) notFound();

  return (
    <main>
      <article className="blog-post">
        <header className="blog-post-header">
          <div className="shell">
            <div className="breadcrumb"><Link href="/">Home</Link><span>→</span><Link href="/blog">Blog</Link></div>
            <span className="eyebrow">{post.category}</span>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="blog-meta"><time dateTime={post.publishedAt}>{post.publishedAt}</time><span>{post.readTime}</span></div>
          </div>
        </header>
        <div className="shell blog-post-body">
          {post.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="blog-post-cta"><h2>Want advice for your own profile?</h2><p>Talk to SAC for a practical application plan based on your goals.</p><Link className="button primary" href="/contact">Contact a counsellor →</Link></div>
        </div>
      </article>
    </main>
  );
}
