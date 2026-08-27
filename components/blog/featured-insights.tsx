import Link from "next/link";
import BlogCard from "@/components/blog/blog-card";
import { getHomepageBlogPosts } from "@/lib/blog/queries";

export default async function FeaturedInsights() {
  let posts;
  try {
    posts = await getHomepageBlogPosts(3);
  } catch {
    return null;
  }
  if (!posts.length) return null;

  const hasHero = Boolean(posts[0].featured);
  return (
    <section className="section featured-insights-section" aria-labelledby="featured-insights-heading">
      <div className="shell">
        <div className="featured-insights-heading">
          <div>
            <span className="eyebrow">Featured insights</span>
            <h2 id="featured-insights-heading">Practical guidance for your next decision.</h2>
            <p>Explore timely advice on applications, destinations, documents, finances, and visas.</p>
          </div>
          <Link className="button secondary" href="/blog">View all insights →</Link>
        </div>
        <div className={`featured-insights-grid${hasHero ? " has-hero" : ""}${posts.length === 3 ? " has-three" : ""}`}>
          {posts.map((post, index) => post.publishedAt ? (
            <BlogCard key={post.slug} post={{ ...post, publishedAt: post.publishedAt }} hero={hasHero && index === 0}/>
          ) : null)}
        </div>
      </div>
    </section>
  );
}
