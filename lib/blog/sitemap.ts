const siteUrl = "https://selfapplycenter.com";

type PublicPostForSitemap = { slug: string; updatedAt: Date };
type PublicCategoryForSitemap = { slug: string; updatedAt: Date };

export function buildBlogSitemapEntries(posts: PublicPostForSitemap[], categories: PublicCategoryForSitemap[]) {
  return [
    { url: `${siteUrl}/blog`, changeFrequency: "weekly" as const, priority: 0.8 },
    ...posts.map((post) => ({ url: `${siteUrl}/blog/${post.slug}`, lastModified: post.updatedAt, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...categories.map((category) => ({ url: `${siteUrl}/blog/category/${category.slug}`, lastModified: category.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
