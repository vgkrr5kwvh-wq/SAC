export const unavailableProfileValue = "Not available";

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

export function formatAdminAccountStatus(isActive: boolean): string {
  return isActive ? "Active" : "Inactive";
}

export function formatAdminProfileDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return unavailableProfileValue;

  return `${kathmanduDateFormatter.format(date)}\n${kathmanduTimeFormatter.format(date)} NPT`;
}
