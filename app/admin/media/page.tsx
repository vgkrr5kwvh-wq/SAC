/* eslint-disable @next/next/no-img-element -- validated arbitrary HTTPS providers are intentionally unsupported by next/image configuration */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buildMediaAdminUrl, buildMediaSearchWhere, formatDimensions, formatFileSize, mediaPageSize, parseMediaPage, parseMediaSearch } from "@/lib/media/params";
import { isSafeMediaImageUrl } from "@/lib/media/validation";
import { prisma } from "@/lib/prisma";
import MediaCardActions from "./media-card-actions";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Media Library", robots: { index: false, follow: false } };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ page?: string | string[]; search?: string | string[]; deleted?: string }> }) {
  if (!(await auth())?.user) redirect("/login?callbackUrl=/admin/media");
  const parameters = await searchParams;
  const page = parseMediaPage(parameters.page);
  const fileType = "";
  const search = parseMediaSearch(parameters.search);
  const where = buildMediaSearchWhere(search);
  let result;
  try {
    result = await prisma.$transaction([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * mediaPageSize,
        take: mediaPageSize,
        select: { id: true, fileName: true, originalName: true, secureUrl: true, url: true, size: true, width: true, height: true, altText: true, provider: true, createdAt: true },
      }),
    ]);
  } catch {
    return <section className="admin-error" role="alert"><h1>Unable to load media assets.</h1><p>Please try again in a moment.</p></section>;
  }
  const [total, assets] = result;
  const totalPages = Math.max(1, Math.ceil(total / mediaPageSize));
  if (page > totalPages) redirect(buildMediaAdminUrl(totalPages, fileType, search));

  return <div className="admin-enquiries-page admin-media-page">
    <header className="admin-dashboard-heading"><div><span className="login-eyebrow">Website content</span><h1>Media Library</h1><p>Upload and reuse securely hosted images.</p></div><Link className="button primary" href="/admin/media/new">Upload image</Link></header>
    {parameters.deleted === "1" ? <p className="admin-media-message is-success" role="status">Media asset deleted.</p> : null}
    <form className="admin-search" action="/admin/media" method="get" role="search"><label htmlFor="media-search">Search by filename</label><div><input id="media-search" name="search" type="search" defaultValue={search} maxLength={100}/><button className="button primary" type="submit">Search</button>{search ? <Link className="button secondary" href="/admin/media">Clear</Link> : null}</div></form>
    <section aria-labelledby="media-grid-title"><div className="admin-table-heading"><div><span>Library records</span><h2 id="media-grid-title">Images</h2></div><small>{total} result{total === 1 ? "" : "s"}</small></div>{assets.length ? <div className="admin-media-grid">{assets.map((asset) => { const url = asset.secureUrl ?? asset.url; return <article className="admin-media-card" key={asset.id}><Link href={`/admin/media/${asset.id}`} aria-label={`View ${asset.originalName}`}>{isSafeMediaImageUrl(url) ? <img src={url} alt={asset.altText || ""} width={asset.width} height={asset.height} loading="lazy" referrerPolicy="no-referrer"/> : <span>Preview unavailable</span>}</Link><div><strong>{asset.originalName}</strong><small>{formatDimensions(asset.width, asset.height)} · {formatFileSize(asset.size)}</small><MediaCardActions url={url} altText={asset.altText}/></div></article>; })}</div> : <div className="cms-blog-empty"><h2>{search ? "No matching images" : "No images yet"}</h2><p>{search ? "Try a different filename." : "Upload your first image to use it across the site."}</p></div>}</section>
    {totalPages > 1 ? <nav className="admin-pagination" aria-label="Media pagination">{page > 1 ? <Link aria-label="Previous media page" href={buildMediaAdminUrl(page - 1, fileType, search)}>Previous</Link> : <span aria-disabled="true">Previous</span>}<p aria-current="page">Page {page} of {totalPages}</p>{page < totalPages ? <Link aria-label="Next media page" href={buildMediaAdminUrl(page + 1, fileType, search)}>Next</Link> : <span aria-disabled="true">Next</span>}</nav> : null}
  </div>;
}
