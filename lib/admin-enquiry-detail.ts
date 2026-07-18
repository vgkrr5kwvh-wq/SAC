export const notCapturedPlaceholder = "Not captured";
export const notSpecifiedPlaceholder = "Not specified";

const enquiryIdPattern = /^c[a-z0-9]{20,29}$/;
const kathmanduDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kathmandu",
});

export function isValidEnquiryId(value: unknown): value is string {
  return typeof value === "string" && enquiryIdPattern.test(value);
}

export function formatPhone(
  phone: string | null | undefined,
): string {
  return phone?.trim() || notCapturedPlaceholder;
}

export function formatStudyDestination(
  interest: string | null | undefined,
): string {
  return interest?.trim() || notSpecifiedPlaceholder;
}

export function formatNotificationStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function formatEnquiryDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return notSpecifiedPlaceholder;
  return kathmanduDateFormatter.format(date);
}
