/* eslint-disable @next/next/no-img-element -- validated arbitrary HTTPS providers are intentionally unsupported by next/image configuration */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogDateFormatter } from "@/lib/blog/dates";
import { formatDimensions, formatFileSize } from "@/lib/media/params";
import { isMediaAssetId, isSafeMediaImageUrl } from "@/lib/media/validation";
import { prisma } from "@/lib/prisma";
import { deleteMediaAction } from "../actions";
import { EditMediaForm } from "../media-form";

export const metadata: Metadata = { title: "Media details", robots: { index: false, follow: false } };
export default async function MediaDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string; delete?: string }> }) {
  const { id } = await params;
  if (!isMediaAssetId(id)) notFound();
  let asset;
  try {
    asset = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, fileName: true, originalName: true, url: true, secureUrl: true, provider: true, mimeType: true, size: true, width: true, height: true, altText: true, caption: true, folder: true, createdAt: true, updatedAt: true } });
  } catch {
    return <section className="admin-error" role="alert"><h1>Unable to load media asset.</h1></section>;
  }
  if (!asset) notFound();
  const notice = await searchParams;
  return <div className="admin-media-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Media Library</span><h1>{asset.originalName}</h1><p>Review storage details and maintain reusable metadata.</p></div><Link className="admin-back-link" href="/admin/media">Back to media</Link></header>
    {notice.created === "1" ? <p className="admin-media-message is-success" role="status">Media asset added successfully.</p> : null}{notice.saved === "1" ? <p className="admin-media-message is-success" role="status">Media metadata updated.</p> : null}{notice.delete === "referenced" ? <p className="admin-media-message is-error" role="alert">This image cannot be deleted while a published blog post references it.</p> : notice.delete ? <p className="admin-media-message is-error" role="alert">Unable to delete media asset.</p> : null}
    <div className="admin-media-detail-grid"><section className="admin-table-card"><div className="admin-table-heading"><h2>Preview</h2></div>{isSafeMediaImageUrl(asset.secureUrl ?? asset.url) ? <img className="admin-media-preview" src={asset.secureUrl ?? asset.url} alt={asset.altText || `Preview of ${asset.originalName}`} loading="lazy" referrerPolicy="no-referrer"/> : <div className="admin-media-document-preview">Image preview unavailable</div>}</section><section className="admin-table-card"><div className="admin-table-heading"><h2>Storage information</h2></div><dl className="admin-detail-list"><div><dt>Provider</dt><dd>{asset.provider}</dd></div><div><dt>MIME type</dt><dd>{asset.mimeType}</dd></div><div><dt>Stored filename</dt><dd>{asset.fileName}</dd></div><div><dt>File size</dt><dd>{formatFileSize(asset.size)}</dd></div><div><dt>Dimensions</dt><dd>{formatDimensions(asset.width, asset.height)}</dd></div><div><dt>Folder</dt><dd>{asset.folder || "Not provided"}</dd></div><div><dt>Created</dt><dd>{blogDateFormatter.format(asset.createdAt)}</dd></div><div><dt>Updated</dt><dd>{blogDateFormatter.format(asset.updatedAt)}</dd></div></dl></section></div>
    <section className="admin-table-card"><div className="admin-table-heading"><div><span>Editable fields</span><h2>Media metadata</h2></div></div><EditMediaForm id={asset.id} values={{ originalName: asset.originalName, altText: asset.altText ?? "", caption: asset.caption ?? "", folder: asset.folder ?? "" }}/></section>
    <section className="admin-table-card admin-media-danger"><div><h2>Delete media asset</h2><p>The image will be removed from Cloudinary unless a published blog post references it.</p></div><form action={deleteMediaAction.bind(null, asset.id)}><button className="button secondary" type="submit">Delete media asset</button></form></section>
  </div>;
}
