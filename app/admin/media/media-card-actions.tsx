"use client";

import { useState } from "react";

export default function MediaCardActions({ url, altText }: { url: string; altText: string | null }) {
  const [notice, setNotice] = useState("");
  const copy = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice(`${label} copied.`); }
    catch { setNotice("Unable to copy. Select and copy the URL manually."); }
  };
  const alt = (altText ?? "").replaceAll("]", "\\]");
  const htmlAlt = (altText ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  return <div className="admin-media-copy-actions">
    <button type="button" onClick={() => copy("URL", url)}>Copy URL</button>
    <button type="button" onClick={() => copy("Markdown", `![${alt}](${url})`)}>Copy Markdown</button>
    <button type="button" onClick={() => copy("HTML", `<img src="${url}" alt="${htmlAlt}" loading="lazy">`)}>Copy HTML</button>
    <span className="sr-only" role="status" aria-live="polite">{notice}</span>
  </div>;
}
