import Link from "next/link";
import { blogPosts } from "../app/blog-posts";

export default function BlogIndex() {
  return (
    <section className="section blog-index">
      <div className="shell">
        <div className="blog-toolbar">
          <div>
            <span className="eyebrow">Latest guidance</span>
            <h2>Fresh advice for your next decision.</h2>
          </div>
          <p>New application, destination, document, and visa guidance will be published here regularly.</p>
        </div>
        <div className="blog-grid">
          {blogPosts.map((post, index) => (
            <article className={`blog-card${index === 0 ? " featured" : ""}`} key={post.slug}>
              <div className="blog-card-copy">
                <div className="blog-card-topline">
                  <span className="blog-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="blog-meta"><span>{post.category}</span><time dateTime={post.publishedAt}>{new Date(`${post.publishedAt}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time></div>
                </div>
                <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                <p>{post.excerpt}</p>
                <Link className="text-action" href={`/blog/${post.slug}`}>Read article · {post.readTime} →</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
