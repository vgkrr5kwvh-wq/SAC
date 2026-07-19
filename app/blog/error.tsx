"use client";

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main><section className="section"><div className="shell cms-blog-empty" role="alert"><h1>Unable to load the blog.</h1><p>Please try again in a moment.</p><button className="button primary" type="button" onClick={reset}>Try again</button></div></section></main>;
}
