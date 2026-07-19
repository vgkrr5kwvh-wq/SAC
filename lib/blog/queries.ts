import { prisma } from "@/lib/prisma";

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
} as const;

const renderedTestPost = {
  title: "Deterministic rendered blog fixture",
  slug: "deterministic-rendered-blog-fixture",
  excerpt: "A stable fixture used only by the rendered HTML test server.",
  content: "# Deterministic article\n\nThis content does not use the configured database.",
  coverImageUrl: null,
  seoTitle: null,
  metaDescription: null,
  featured: true,
  publishedAt: new Date("2026-07-01T06:15:00.000Z"),
  updatedAt: new Date("2026-07-01T06:15:00.000Z"),
};

function isRenderedTestFixtureEnabled(): boolean {
  return process.env.BLOG_RENDER_TEST_MODE === "fixture";
}

export async function getPublicBlogPage(page: number, pageSize: number, now = new Date()) {
  if (isRenderedTestFixtureEnabled()) {
    const posts = page === 1 ? [renderedTestPost] : [];
    return { total: 1, posts };
  }

  const where = {
    status: "PUBLISHED" as const,
    publishedAt: { not: null, lte: now },
  };
  const [total, posts] = await prisma.$transaction([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { id: "desc" }],
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
      status: "PUBLISHED",
      publishedAt: { not: null, lte: now },
    },
    select: publicBlogPostSelect,
  });
}
