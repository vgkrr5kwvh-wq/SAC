export const blogWordsPerMinute = 200;

export function estimateReadingTime(markdown: string): number {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|\\-]+/g, " ")
    .trim();
  const words = plainText ? plainText.split(/\s+/u).length : 0;
  return Math.max(1, Math.ceil(words / blogWordsPerMinute));
}

export function formatReadingTime(markdown: string): string {
  return `${estimateReadingTime(markdown)} min read`;
}
