import type { Prisma } from "@prisma/client";
import {
  parsePageParameter,
  sanitizeSearchParameter,
} from "./admin-enquiry-params";

export { parsePageParameter, sanitizeSearchParameter };

export function buildPartnerEnquirySearchWhere(
  query: string,
): Prisma.PartnerEnquiryWhereInput {
  return query
    ? {
        OR: [
          { contactName: { contains: query } },
          { organisation: { contains: query } },
          { workEmail: { contains: query } },
        ],
      }
    : {};
}

export function buildPartnerEnquiriesUrl(page: number, query: string): string {
  const parameters = new URLSearchParams();
  parameters.set("page", String(page));
  if (query) parameters.set("q", query);

  return `/admin/partner-enquiries?${parameters.toString()}`;
}

export function buildPartnerEnquiriesExportUrl(query: string): string {
  const parameters = new URLSearchParams();
  if (query) parameters.set("q", query);

  const search = parameters.toString();
  return `/admin/partner-enquiries/export${search ? `?${search}` : ""}`;
}
