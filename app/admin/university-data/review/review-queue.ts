import type { ImportRecordStatus, Prisma } from "@prisma/client";

export const reviewQueueWhere = {
  status: { in: ["STAGED", "MANUAL_REVIEW"] },
} satisfies Prisma.ImportRecordWhereInput;

export function isReviewEligibleStatus(status: ImportRecordStatus): boolean {
  return status === "STAGED" || status === "MANUAL_REVIEW";
}
