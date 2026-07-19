import type { MetadataRoute } from "next";
import { sitePages } from "@/app/site-data";
import { buildBlogSitemapEntries } from "@/lib/blog/sitemap";
import { buildPublicBlogWhere } from "@/lib/blog/validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const siteUrl = "https://selfapplycenter.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(sitePages).map((slug) => ({ url: `${siteUrl}/${slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
  try {
    const now = new Date();
    const [posts, categories] = await Promise.all([
      prisma.blogPost.findMany({
        where: buildPublicBlogWhere(now),
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { slug: "asc" }, { id: "asc" }],
        select: { slug: true, updatedAt: true },
      }),
    ]);
    return [...staticEntries, ...buildBlogSitemapEntries(posts, categories)];
  } catch {
    return [...staticEntries, ...buildBlogSitemapEntries([], [])];
  }
}
