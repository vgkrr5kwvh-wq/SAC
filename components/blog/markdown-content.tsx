import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export default function MarkdownContent({ content }: { content: string }) {
  return <div className="blog-markdown"><ReactMarkdown rehypePlugins={[rehypeSanitize]} skipHtml components={{
    a: ({ href, children, ...props }) => {
      const external = Boolean(href && /^https?:\/\//i.test(href));
      return <a {...props} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{children}</a>;
    },
  }}>{content}</ReactMarkdown></div>;
}
