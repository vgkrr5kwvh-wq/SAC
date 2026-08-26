const legacyWordPressQueryKeys = new Set([
  "p",
  "page_id",
  "attachment_id",
  "cat",
  "tag",
  "author",
  "s",
  "m",
]);

export function hasLegacyWordPressQuery(searchParams: URLSearchParams): boolean {
  return [...searchParams.keys()].some((key) => legacyWordPressQueryKeys.has(key));
}
