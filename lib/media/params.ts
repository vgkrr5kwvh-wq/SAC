export const mediaPageSize = 20;

export function parseMediaPage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}

export function parseMediaType(value: string | string[] | undefined): "IMAGE" | "DOCUMENT" | "" {
  return value === "IMAGE" || value === "DOCUMENT" ? value : "";
}

export function parseMediaSearch(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}

export function buildMediaSearchWhere(search: string) {
  return search ? { OR: [{ fileName: { contains: search } }, { originalName: { contains: search } }] } : {};
}

export function buildMediaAdminUrl(page: number, fileType = "", search = ""): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (fileType === "IMAGE" || fileType === "DOCUMENT") params.set("type", fileType);
  if (search) params.set("search", search);
  const query = params.toString();
  return `/admin/media${query ? `?${query}` : ""}`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "Not available";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function formatDimensions(width: number | null, height: number | null): string {
  return width && height ? `${width} × ${height} px` : "Not available";
}
