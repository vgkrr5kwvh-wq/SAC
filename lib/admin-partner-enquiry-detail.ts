export const notProvidedPlaceholder = "Not provided";

const partnerEnquiryIdPattern = /^c[a-z0-9]{20,29}$/;
const kathmanduDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kathmandu",
});
const kathmanduTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kathmandu",
});

export function isValidPartnerEnquiryId(value: unknown): value is string {
  return typeof value === "string" && partnerEnquiryIdPattern.test(value);
}

export function formatPartnerField(
  value: string | null | undefined,
): string {
  return value?.trim() || notProvidedPlaceholder;
}

export function formatPartnerType(value: string | null | undefined): string {
  const partnerType = value?.trim();
  if (!partnerType) return notProvidedPlaceholder;

  return partnerType
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function formatPartnerNotificationStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function formatPartnerEnquiryDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return notProvidedPlaceholder;

  return `${kathmanduDateFormatter.format(date)}\n${kathmanduTimeFormatter.format(date)} NPT`;
}
