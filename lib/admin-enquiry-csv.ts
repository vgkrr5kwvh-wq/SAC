export const csvBom = "\uFEFF";
export const studentEnquiryCsvHeaders = [
  "Full Name",
  "Email",
  "Study Destination",
  "Message",
  "Notification Status",
  "Submitted Date",
] as const;

const defaultPlaceholder = "Not provided";
const destinationPlaceholder = "Not specified";
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
const kathmanduFilenameFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kathmandu",
});

export type StudentEnquiryCsvRecord = {
  name: string | null;
  email: string | null;
  interest: string | null;
  message: string | null;
  notificationStatus: string | null;
  createdAt: Date;
};

export function normalizeCsvValue(
  value: string | null | undefined,
  placeholder = defaultPlaceholder,
): string {
  return value === null || value === undefined || value === ""
    ? placeholder
    : value;
}

export function protectCsvFormula(value: string): string {
  return /^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(
  value: string | null | undefined,
  placeholder = defaultPlaceholder,
): string {
  const protectedValue = protectCsvFormula(
    normalizeCsvValue(value, placeholder),
  );
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

export function formatExportDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return defaultPlaceholder;
  return `${kathmanduDateFormatter.format(date)} ${kathmanduTimeFormatter.format(date)} NPT`;
}

export function formatStudentExportDate(date: Date): string {
  return formatExportDate(date);
}

export function formatNotificationStatusForCsv(
  status: string | null | undefined,
): string {
  const value = normalizeCsvValue(status);
  if (value === defaultPlaceholder) return value;

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function buildCsvDocument(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | null | undefined>>,
): string {
  const csvRows = [
    headers.map((header) => escapeCsvCell(header)).join(","),
    ...rows.map((row) => row.map((value) => escapeCsvCell(value)).join(",")),
  ];

  return `${csvBom}${csvRows.join("\r\n")}\r\n`;
}

export function buildStudentEnquiriesCsv(
  records: StudentEnquiryCsvRecord[],
): string {
  return buildCsvDocument(
    studentEnquiryCsvHeaders,
    records.map((record) => [
      record.name,
      record.email,
      normalizeCsvValue(record.interest, destinationPlaceholder),
      record.message,
      formatNotificationStatusForCsv(record.notificationStatus),
      formatStudentExportDate(record.createdAt),
    ]),
  );
}

export function buildExportFilename(prefix: string, date: Date): string {
  const parts = kathmanduFilenameFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;

  return `${prefix}-${part("year")}-${part("month")}-${part("day")}.csv`;
}

export function buildStudentExportFilename(date: Date): string {
  return buildExportFilename("student-enquiries", date);
}

export function limitExportRecords<T>(
  records: T[],
  limit = 10_000,
): { records: T[]; truncated: boolean } {
  return {
    records: records.slice(0, limit),
    truncated: records.length > limit,
  };
}
