/* eslint-disable @next/next/no-img-element -- editor-selected HTTPS providers are dynamic and validated at render time. */
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { isSafeMediaImageUrl } from "@/lib/media/validation";

export default function MarkdownContent({ content }: { content: string }) {
  return <div className="blog-markdown"><ReactMarkdown rehypePlugins={[rehypeSanitize]} skipHtml components={{
    img: ({ src, alt }) => isSafeMediaImageUrl(src) ? <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" /> : null,
    h1: ({ children }) => <h2>{children}</h2>,
    a: ({ href, children, ...props }) => {
      const external = Boolean(href && /^https?:\/\//i.test(href));
      return <a {...props} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{children}</a>;
    },
  }}>{content}</ReactMarkdown></div>;
}
