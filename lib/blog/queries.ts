import type { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { buildPublicBlogWhere } from "./validation";

export const publicBlogPostSelect = {
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  seoTitle: true,
  metaDescription: true,
  featured: true,
  publishedAt: true,
  updatedAt: true,
  categories: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } },
} satisfies Prisma.BlogPostSelect;

export type PublicBlogPost = Prisma.BlogPostGetPayload<{ select: typeof publicBlogPostSelect }>;
type HomepageBlogFindMany = (args: {
  where: Prisma.BlogPostWhereInput;
  orderBy: Prisma.BlogPostOrderByWithRelationInput[];
  take: number;
}) => Promise<PublicBlogPost[]>;

export const publicBlogOrderBy: Prisma.BlogPostOrderByWithRelationInput[] = [
  { featured: "desc" },
  { publishedAt: "desc" },
  { id: "desc" },
];

const newestBlogOrderBy: Prisma.BlogPostOrderByWithRelationInput[] = [
  { publishedAt: "desc" },
  { id: "desc" },
];

const renderedTestPost = {
  title: "Deterministic rendered blog fixture",
  slug: "deterministic-rendered-blog-fixture",
  excerpt: "A stable fixture used only by the rendered HTML test server.",
  content: "# Deterministic article\n\nThis content does not use the configured database.",
  coverImageUrl: null,
  seoTitle: "Deterministic rendered blog fixture | Self Apply Center",
  metaDescription: null,
  featured: true,
  publishedAt: new Date("2026-07-01T06:15:00.000Z"),
  updatedAt: new Date("2026-07-01T06:15:00.000Z"),
  categories: [{ name: "Study Guides", slug: "study-guides" }],
};

function isRenderedTestFixtureEnabled(): boolean {
  return process.env.BLOG_RENDER_TEST_MODE === "fixture";
}

export async function getHomepageBlogPosts(
  limit = 3,
  now = new Date(),
  findMany: HomepageBlogFindMany = (args) => prisma.blogPost.findMany({ ...args, select: publicBlogPostSelect }),
) {
  const take = Math.max(1, Math.trunc(limit));
  if (isRenderedTestFixtureEnabled()) return [renderedTestPost].slice(0, take);
  const publicWhere = buildPublicBlogWhere(now);
  const featuredPosts = await findMany({
    where: { ...publicWhere, featured: true },
    orderBy: newestBlogOrderBy,
    take,
  });
  if (featuredPosts.length) return featuredPosts;
  return findMany({ where: publicWhere, orderBy: newestBlogOrderBy, take });
}

export const getPublicCategory = cache(async function getPublicCategory(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return null;
  if (isRenderedTestFixtureEnabled()) return slug === "study-guides" ? { name: "Study Guides", slug: "study-guides", description: "Deterministic category." } : null;
  return prisma.category.findFirst({ where: { slug, isActive: true }, select: { name: true, slug: true, description: true } });
});

export async function getPublicCategoryPage(slug: string, page: number, pageSize: number, now = new Date()) {
  const category = await getPublicCategory(slug);
  if (!category) return null;
  if (isRenderedTestFixtureEnabled()) return { category, total: 1, posts: page === 1 ? [renderedTestPost] : [] };
  const where = { ...buildPublicBlogWhere(now), categories: { some: { slug, isActive: true } } };
  const [total, posts] = await prisma.$transaction([prisma.blogPost.count({ where }), prisma.blogPost.findMany({ where, orderBy: publicBlogOrderBy, skip: (page - 1) * pageSize, take: pageSize, select: publicBlogPostSelect })]);
  return { category, total, posts };
}

export async function getPublicBlogPage(page: number, pageSize: number, now = new Date()) {
  if (isRenderedTestFixtureEnabled()) {
    const posts = page === 1 ? [renderedTestPost] : [];
    return { total: 1, posts };
  }

  const where = buildPublicBlogWhere(now);
  const [total, posts] = await prisma.$transaction([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: publicBlogOrderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: publicBlogPostSelect,
    }),
  ]);
  return { total, posts };
}

export async function getPublicBlogPost(slug: string, now = new Date()) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 220) return null;
  if (isRenderedTestFixtureEnabled()) return slug === renderedTestPost.slug ? renderedTestPost : null;

  return prisma.blogPost.findFirst({
    where: {
      slug,
      ...buildPublicBlogWhere(now),
    },
    select: publicBlogPostSelect,
  });
}
