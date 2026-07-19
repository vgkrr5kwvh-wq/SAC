import type { Metadata } from "next";
import Link from "next/link";
import { CreateMediaForm } from "../media-form";

export const metadata: Metadata = { title: "Add media", robots: { index: false, follow: false } };

export default function NewMediaPage() {
  return <div className="admin-media-editor"><header className="admin-dashboard-heading"><div><span className="login-eyebrow">Media Library</span><h1>Upload image</h1><p>Upload a validated image to the configured Cloudinary account.</p></div><Link className="admin-back-link" href="/admin/media">Back to media</Link></header><section className="admin-table-card"><div className="admin-table-heading"><div><span>Cloudinary</span><h2>Image and metadata</h2></div></div><CreateMediaForm/></section></div>;
}
