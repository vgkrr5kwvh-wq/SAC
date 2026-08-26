const brandName = "Self Apply Center";
const trailingBrandSuffix = /(?:\s*\|\s*self apply center\s*)+$/i;
const repeatedTrailingBrandSuffix = /(?:\s*\|\s*self apply center\s*){2,}$/i;

export function buildBrandedTitle(rawTitle: string): string {
  const title = rawTitle.replace(trailingBrandSuffix, "").trim();
  return `${title} | ${brandName}`;
}

export function normalizeDuplicateSocialTitle(rawTitle: string): string {
  return repeatedTrailingBrandSuffix.test(rawTitle) ? buildBrandedTitle(rawTitle) : rawTitle;
}
