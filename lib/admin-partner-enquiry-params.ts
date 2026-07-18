import {
  parsePageParameter,
  sanitizeSearchParameter,
} from "./admin-enquiry-params";

export { parsePageParameter, sanitizeSearchParameter };

export function buildPartnerEnquiriesUrl(page: number, query: string): string {
  const parameters = new URLSearchParams();
  parameters.set("page", String(page));
  if (query) parameters.set("q", query);

  return `/admin/partner-enquiries?${parameters.toString()}`;
}
