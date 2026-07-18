export function isBlogPostId(value: unknown): value is string {
  return typeof value === "string" && /^c[a-z0-9]{20,29}$/.test(value);
}
