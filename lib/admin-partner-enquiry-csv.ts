import {
  buildCsvDocument,
  buildExportFilename,
  formatExportDate,
  formatNotificationStatusForCsv,
  normalizeCsvValue,
} from "./admin-enquiry-csv";

export const partnerEnquiryCsvHeaders = [
  "Partner Type",
  "Contact Name",
  "Work Email",
  "Organisation",
  "Country / Locations",
  "Partnership Proposal",
  "Details",
  "Additional Details",
  "Notification Status",
  "Submitted Date",
] as const;

export type PartnerEnquiryCsvRecord = {
  partnerType: string | null;
  contactName: string | null;
  workEmail: string | null;
  organisation: string | null;
  locations: string | null;
  partnershipProposal: string | null;
  details: string | null;
  additionalDetails: string | null;
  notificationStatus: string | null;
  createdAt: Date;
};

function formatPartnerTypeForCsv(value: string | null | undefined): string {
  const partnerType = normalizeCsvValue(value);
  if (partnerType === "Not provided") return partnerType;

  return partnerType
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

export function buildPartnerEnquiriesCsv(
  records: PartnerEnquiryCsvRecord[],
): string {
  return buildCsvDocument(
    partnerEnquiryCsvHeaders,
    records.map((record) => [
      formatPartnerTypeForCsv(record.partnerType),
      record.contactName,
      record.workEmail,
      record.organisation,
      record.locations,
      record.partnershipProposal,
      record.details,
      record.additionalDetails,
      formatNotificationStatusForCsv(record.notificationStatus),
      formatExportDate(record.createdAt),
    ]),
  );
}

export function buildPartnerExportFilename(date: Date): string {
  return buildExportFilename("partner-enquiries", date);
}
