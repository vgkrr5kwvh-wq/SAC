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

function normalizeCsvValue(
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

export function formatStudentExportDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return defaultPlaceholder;
  return `${kathmanduDateFormatter.format(date)} ${kathmanduTimeFormatter.format(date)} NPT`;
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

export function buildStudentEnquiriesCsv(
  records: StudentEnquiryCsvRecord[],
): string {
  const rows = [
    studentEnquiryCsvHeaders.map((header) => escapeCsvCell(header)).join(","),
    ...records.map((record) =>
      [
        escapeCsvCell(record.name),
        escapeCsvCell(record.email),
        escapeCsvCell(record.interest, destinationPlaceholder),
        escapeCsvCell(record.message),
        escapeCsvCell(
          formatNotificationStatusForCsv(record.notificationStatus),
        ),
        escapeCsvCell(formatStudentExportDate(record.createdAt)),
      ].join(","),
    ),
  ];

  return `${csvBom}${rows.join("\r\n")}\r\n`;
}

export function buildStudentExportFilename(date: Date): string {
  const parts = kathmanduFilenameFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value;

  return `student-enquiries-${part("year")}-${part("month")}-${part("day")}.csv`;
}
