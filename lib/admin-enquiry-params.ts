import type { Prisma } from "@prisma/client";

const maximumPageNumber = 1_000_000;
const maximumSearchLength = 100;

export function parsePageParameter(value: string | string[] | undefined): number {
  if (typeof value !== "string") return 1;

  const normalizedValue = value.trim();
  if (!/^[1-9]\d*$/.test(normalizedValue)) return 1;

  const page = Number(normalizedValue);
  if (!Number.isSafeInteger(page) || page > maximumPageNumber) return 1;

  return page;
}

export function sanitizeSearchParameter(
  value: string | string[] | null | undefined,
): string {
  if (typeof value !== "string") return "";

  return value.trim().replace(/\s+/g, " ").slice(0, maximumSearchLength);
}

export function buildEnquirySearchWhere(
  query: string,
): Prisma.EnquiryWhereInput {
  return query
    ? {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { interest: { contains: query } },
        ],
      }
    : {};
}

export function buildEnquiriesUrl(page: number, query: string): string {
  const parameters = new URLSearchParams();
  parameters.set("page", String(page));
  if (query) parameters.set("q", query);

  return `/admin/enquiries?${parameters.toString()}`;
}

export function buildEnquiriesExportUrl(query: string): string {
  const parameters = new URLSearchParams();
  if (query) parameters.set("q", query);

  const search = parameters.toString();
  return `/admin/enquiries/export${search ? `?${search}` : ""}`;
}
