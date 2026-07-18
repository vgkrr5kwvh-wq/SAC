const nepalOffsetMilliseconds = 345 * 60 * 1000;

export const blogDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kathmandu",
});

export function parseNepalDateTimeInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute) - nepalOffsetMilliseconds);
  const nepal = new Date(date.getTime() + nepalOffsetMilliseconds);
  if (
    nepal.getUTCFullYear() !== year ||
    nepal.getUTCMonth() !== month - 1 ||
    nepal.getUTCDate() !== day ||
    nepal.getUTCHours() !== hour ||
    nepal.getUTCMinutes() !== minute
  ) return null;
  return date;
}

export function formatNepalDateTimeInput(value: Date | null): string {
  if (!value) return "";
  const nepal = new Date(value.getTime() + nepalOffsetMilliseconds);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${nepal.getUTCFullYear()}-${pad(nepal.getUTCMonth() + 1)}-${pad(nepal.getUTCDate())}T${pad(nepal.getUTCHours())}:${pad(nepal.getUTCMinutes())}`;
}
