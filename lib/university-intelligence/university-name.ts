export function universityDisplayName(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  const withoutPageLabel = compact.replace(
    /(?:\s*[-|–—:]\s*|\s+)(?:home\s*page)$/i,
    "",
  ).trim();
  return withoutPageLabel || compact;
}
