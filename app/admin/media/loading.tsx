export default function MediaLoading() {
  return <section className="admin-media-loading" aria-busy="true" aria-live="polite"><h1>Media Library</h1><p>Loading images…</p><div className="admin-media-grid" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <span className="admin-media-skeleton" key={index}/>)}</div></section>;
}
