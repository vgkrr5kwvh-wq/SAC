import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { blogDateFormatter } from "@/lib/blog/dates";
import { blogPageSize, buildBlogAdminUrl, parseBlogPage, parseBlogSearch } from "@/lib/blog/params";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Blog CMS", robots: { index: false, follow: false } };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ page?: string | string[]; search?: string | string[] }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/blog");
  const parameters = await searchParams;
  const page = parseBlogPage(parameters.page);
  const search = parseBlogSearch(parameters.search);
  const where = search ? { OR: [{ title: { contains: search } }, { slug: { contains: search } }] } : {};
  let result;
  try {
    result = await prisma.$transaction([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * blogPageSize,
        take: blogPageSize,
        select: { id: true, title: true, slug: true, status: true, featured: true, publishedAt: true, updatedAt: true },
      }),
    ]);
  } catch {
    return <section className="admin-error" role="alert"><span className="login-eyebrow">Blog unavailable</span><h1>Unable to load blog posts</h1><p>Please try again in a moment.</p></section>;
  }
  const [total, posts] = result;
  const totalPages = Math.max(1, Math.ceil(total / blogPageSize));
  if (page > totalPages) redirect(buildBlogAdminUrl(totalPages, search));
  return <div className="admin-enquiries-page admin-blog-page">
    <section className="admin-dashboard-heading"><div><span className="login-eyebrow">Website content</span><h1>Blog CMS</h1><p>Create and maintain public study-abroad guidance.</p></div><div className="admin-heading-actions"><Link className="button primary" href="/admin/blog/new">New post</Link></div></section>
    <form className="admin-search" action="/admin/blog" method="get" role="search"><label htmlFor="blog-search">Search blog posts</label><div><input id="blog-search" name="search" type="search" defaultValue={search} maxLength={100} placeholder="Search by title or slug"/><button className="button primary">Search</button>{search ? <Link className="button secondary" href="/admin/blog">Clear</Link> : null}</div></form>
    <section className="admin-table-card" aria-labelledby="blog-post-table"><div className="admin-table-heading"><div><span>Content records</span><h2 id="blog-post-table">Blog Posts</h2></div><small>{total} result{total === 1 ? "" : "s"}</small></div><div className="admin-table-scroll"><table className="admin-enquiries-table"><thead><tr><th scope="col">Title</th><th scope="col">Slug</th><th scope="col">Status</th><th scope="col">Featured</th><th scope="col">Published</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{posts.length ? posts.map((post) => <tr key={post.id}><td data-label="Title">{post.title}</td><td data-label="Slug">{post.slug}</td><td data-label="Status"><span className={`admin-blog-status is-${post.status.toLowerCase()}`}>{post.status}</span></td><td data-label="Featured">{post.featured ? "Yes" : "No"}</td><td data-label="Published">{post.publishedAt ? blogDateFormatter.format(post.publishedAt) : "Not published"}</td><td data-label="Updated">{blogDateFormatter.format(post.updatedAt)}</td><td className="admin-table-action"><Link href={`/admin/blog/${post.id}/edit`} aria-label={`Edit ${post.title}`}>Edit</Link></td></tr>) : <tr><td className="admin-empty-row" colSpan={7}>{search ? "No blog posts match your search." : "No blog posts yet."}</td></tr>}</tbody></table></div></section>
    <nav className="admin-pagination" aria-label="Blog pagination">{page > 1 ? <Link href={buildBlogAdminUrl(page - 1, search)}>Previous</Link> : <span aria-disabled="true">Previous</span>}<p aria-current="page">Page {page} of {totalPages}</p>{page < totalPages ? <Link href={buildBlogAdminUrl(page + 1, search)}>Next</Link> : <span aria-disabled="true">Next</span>}</nav>
  </div>;
}
