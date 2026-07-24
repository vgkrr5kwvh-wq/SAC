"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import { prisma } from "@/lib/prisma";

const reviewInputSchema = z.object({
  recordId: z.string().cuid(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(2000).optional(),
});

export type ImportReviewActionState = { status: "idle" | "success" | "error"; message: string };

function claimNumber(value: Prisma.JsonValue): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function claimText(value: Prisma.JsonValue): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function claimBoolean(value: Prisma.JsonValue): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function verificationForSource(sourceName: string) {
  return sourceName === "manual-review" ? "MANUALLY_VERIFIED" as const
    : sourceName === "official-university" ? "OFFICIAL_VERIFIED" as const
      : "PARTNER_MATCHED" as const;
}

export async function materializeApprovedEnrichment(
  transaction: Prisma.TransactionClient,
  universityId: string,
  claims: Array<{
    programId: string | null;
    entityType: string;
    fieldName: string;
    valueJson: Prisma.JsonValue;
    sourceName: string;
    sourceUrl: string;
    studyLevel: string | null;
    entryRoute: string | null;
    academicYear: string | null;
    isPreferred: boolean;
  }>,
) {
  const preferred = claims.filter((claim) => claim.isPreferred);
  const universityData: Record<string, string | number | null> = {};
  const universityFieldMap: Record<string, string> = {
    officialName: "name", city: "city", state: "state", address: "address",
    institutionType: "institutionType", foundedYear: "foundedYear",
    description: "description", logoUrl: "logoUrl", officialWebsiteUrl: "officialWebsiteUrl",
  };
  for (const claim of preferred.filter((item) => item.entityType === "university")) {
    const field = universityFieldMap[claim.fieldName];
    if (!field) continue;
    universityData[field] = field === "foundedYear" ? claimNumber(claim.valueJson) : claimText(claim.valueJson);
  }
  if (Object.keys(universityData).length) {
    await transaction.university.update({ where: { id: universityId }, data: universityData });
  }

  const requirementClaims = Map.groupBy(
    preferred.filter((claim) => claim.entityType === "admission-requirement"),
    (claim) => `${claim.programId ?? ""}|${claim.studyLevel ?? ""}|${claim.entryRoute ?? "direct"}`,
  );
  for (const group of requirementClaims.values()) {
    const first = group[0];
    const fields = new Map(group.map((claim) => [claim.fieldName, claim]));
    const data = {
      minimumGpa: claimNumber(fields.get("minimumGpa")?.valueJson ?? null),
      ieltsOverall: claimNumber(fields.get("ieltsOverall")?.valueJson ?? null),
      toeflOverall: claimNumber(fields.get("toeflOverall")?.valueJson ?? null),
      pteOverall: claimNumber(fields.get("pteOverall")?.valueJson ?? null),
      duolingoOverall: claimNumber(fields.get("duolingoOverall")?.valueJson ?? null),
      academicRequirementText: claimText(fields.get("academicRequirementText")?.valueJson ?? null),
      applicationFee: claimNumber(fields.get("applicationFee")?.valueJson ?? null),
      greRequired: claimBoolean(fields.get("greRequired")?.valueJson ?? null),
      gmatRequired: claimBoolean(fields.get("gmatRequired")?.valueJson ?? null),
      satRequired: claimBoolean(fields.get("satRequired")?.valueJson ?? null),
      actRequired: claimBoolean(fields.get("actRequired")?.valueJson ?? null),
      workExperience: claimText(fields.get("workExperience")?.valueJson ?? null),
      prerequisiteSubjects: claimText(fields.get("prerequisiteSubjects")?.valueJson ?? null),
      portfolioRequired: claimBoolean(fields.get("portfolioRequired")?.valueJson ?? null),
      statementOfPurposeRequired: claimBoolean(fields.get("statementOfPurposeRequired")?.valueJson ?? null),
      recommendationLetters: claimNumber(fields.get("recommendationLetters")?.valueJson ?? null),
      requirementUrl: first.sourceUrl,
      sourceName: first.sourceName,
      sourceUrl: first.sourceUrl,
      verificationStatus: verificationForSource(first.sourceName),
    };
    const existing = await transaction.admissionRequirement.findFirst({
      where: {
        universityId,
        programId: first.programId,
        studyLevel: first.studyLevel,
        entryRoute: first.entryRoute ?? "direct",
        sourceName: first.sourceName,
      },
      select: { id: true },
    });
    if (existing) await transaction.admissionRequirement.update({ where: { id: existing.id }, data });
    else await transaction.admissionRequirement.create({
      data: {
        ...data,
        universityId,
        programId: first.programId,
        studyLevel: first.studyLevel,
        entryRoute: first.entryRoute ?? "direct",
      },
    });
  }

  const tuitionClaims = Map.groupBy(
    preferred.filter((claim) => claim.entityType === "tuition"),
    (claim) => `${claim.programId ?? ""}|${claim.studyLevel ?? ""}|${claim.entryRoute ?? "direct"}|${claim.academicYear ?? ""}`,
  );
  for (const group of tuitionClaims.values()) {
    const first = group[0];
    const fields = new Map(group.map((claim) => [claim.fieldName, claim.valueJson]));
    await transaction.tuition.create({
      data: {
        universityId,
        programId: first.programId,
        studyLevel: first.studyLevel,
        amount: claimNumber(fields.get("amount") ?? null),
        currency: claimText(fields.get("currency") ?? null),
        period: claimText(fields.get("period") ?? null),
        housingCost: claimNumber(fields.get("housingCost") ?? null),
        mealCost: claimNumber(fields.get("mealCost") ?? null),
        booksCost: claimNumber(fields.get("booksCost") ?? null),
        insuranceCost: claimNumber(fields.get("insuranceCost") ?? null),
        otherFees: claimNumber(fields.get("otherFees") ?? null),
        estimatedCoa: claimNumber(fields.get("estimatedCoa") ?? null),
        academicYear: first.academicYear,
        tuitionUrl: first.sourceUrl,
        sourceName: first.sourceName,
        sourceUrl: first.sourceUrl,
        verificationStatus: verificationForSource(first.sourceName),
      },
    });
  }

  const scholarshipClaims = Map.groupBy(
    preferred.filter((claim) => claim.entityType === "scholarship"),
    (claim) => `${claim.programId ?? ""}|${claim.studyLevel ?? ""}|${claim.entryRoute ?? "direct"}|${claim.sourceUrl}`,
  );
  for (const group of scholarshipClaims.values()) {
    const first = group[0];
    const fields = new Map(group.map((claim) => [claim.fieldName, claim.valueJson]));
    await transaction.scholarship.create({
      data: {
        universityId,
        programId: first.programId,
        name: claimText(fields.get("name") ?? null),
        scholarshipAvailable: claimBoolean(fields.get("scholarshipAvailable") ?? null) === true ? "AVAILABLE" : "UNKNOWN",
        amountText: claimText(fields.get("amountText") ?? null),
        minimumAmount: claimNumber(fields.get("minimumAmount") ?? null),
        maximumAmount: claimNumber(fields.get("maximumAmount") ?? null),
        currency: claimText(fields.get("currency") ?? null),
        eligibilityText: claimText(fields.get("eligibilityText") ?? null),
        minimumGpa: claimNumber(fields.get("minimumGpa") ?? null),
        isAutomatic: claimBoolean(fields.get("isAutomatic") ?? null),
        requiresSeparateApplication: claimBoolean(fields.get("requiresSeparateApplication") ?? null),
        isRenewable: claimBoolean(fields.get("isRenewable") ?? null),
        renewalCriteria: claimText(fields.get("renewalCriteria") ?? null),
        deadlineText: claimText(fields.get("deadline") ?? null),
        studyLevel: first.studyLevel,
        entryRoute: first.entryRoute,
        scholarshipUrl: first.sourceUrl,
        sourceName: first.sourceName,
        sourceUrl: first.sourceUrl,
        publicationStatus: "DRAFT",
        verificationStatus: verificationForSource(first.sourceName),
      },
    });
  }

  const intakeClaims = Map.groupBy(
    preferred.filter((claim) => claim.entityType === "intake"),
    (claim) => `${claim.programId ?? ""}|${claim.studyLevel ?? ""}|${claim.entryRoute ?? "direct"}|${claim.sourceUrl}`,
  );
  for (const group of intakeClaims.values()) {
    const first = group[0];
    const fields = new Map(group.map((claim) => [claim.fieldName, claim.valueJson]));
    const deadlineText = claimText(fields.get("deadline") ?? null);
    const deadline = deadlineText && !Number.isNaN(Date.parse(deadlineText)) ? new Date(deadlineText) : null;
    const term = claimText(fields.get("term") ?? null);
    if (!term) continue;
    await transaction.intake.create({
      data: {
        universityId,
        programId: first.programId,
        term,
        month: claimNumber(fields.get("month") ?? null),
        year: claimNumber(fields.get("year") ?? null),
        deadline,
        deadlineType: claimText(fields.get("deadlineType") ?? null) ?? "application",
        studyLevel: first.studyLevel,
        entryRoute: first.entryRoute,
        intakeUrl: first.sourceUrl,
        sourceName: first.sourceName,
        sourceUrl: first.sourceUrl,
        verificationStatus: verificationForSource(first.sourceName),
      },
    });
  }
}

export async function reviewImportRecordAction(
  _previousState: ImportReviewActionState,
  formData: FormData,
): Promise<ImportReviewActionState> {
  const session = await auth();
  if (!session?.user || !hasAdminPermission(session.user.role, "manage_university_data")) {
    return { status: "error", message: "You do not have permission to review university data." };
  }
  const parsed = reviewInputSchema.safeParse({
    recordId: formData.get("recordId"),
    decision: formData.get("decision"),
    reviewNote: formData.get("reviewNote") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "The review request is invalid." };
  try {
    await prisma.$transaction(async (transaction) => {
      const record = await transaction.importRecord.findUnique({ where: { id: parsed.data.recordId }, select: { status: true } });
      if (!record || !["STAGED", "MANUAL_REVIEW"].includes(record.status)) {
        throw new Error("This record is no longer awaiting review.");
      }
      await transaction.importRecord.update({
        where: { id: parsed.data.recordId },
        data: {
          status: parsed.data.decision,
          reviewNote: parsed.data.reviewNote ?? null,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
      if (parsed.data.decision === "APPROVED") {
        const enrichment = await transaction.importRecord.findUnique({
          where: { id: parsed.data.recordId },
          select: {
            entityType: true,
            universityId: true,
            fieldClaims: { select: { authorityLevel: true, programId: true } },
          },
        });
        if (enrichment?.entityType === "university-enrichment" && enrichment.universityId) {
          const officialClaims = enrichment.fieldClaims.filter((claim) => claim.authorityLevel === "OFFICIAL_UNIVERSITY");
          if (officialClaims.length) {
            await transaction.university.updateMany({
              where: { id: enrichment.universityId, verificationStatus: { not: "MANUALLY_VERIFIED" } },
              data: { verificationStatus: "OFFICIAL_VERIFIED" },
            });
            const programIds = [...new Set(officialClaims.flatMap((claim) => claim.programId ? [claim.programId] : []))];
            if (programIds.length) {
              await transaction.program.updateMany({
                where: { id: { in: programIds }, verificationStatus: { not: "MANUALLY_VERIFIED" } },
                data: { verificationStatus: "OFFICIAL_VERIFIED", lastVerifiedAt: new Date() },
              });
            }
            const claims = await transaction.universityFieldClaim.findMany({
              where: { importRecordId: parsed.data.recordId },
              select: {
                programId: true, entityType: true, fieldName: true, valueJson: true,
                sourceName: true, sourceUrl: true, studyLevel: true, entryRoute: true,
                academicYear: true, isPreferred: true,
              },
            });
            await materializeApprovedEnrichment(transaction, enrichment.universityId, claims);
          }
        }
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/admin/university-data");
    revalidatePath("/admin/university-data/review");
    return {
      status: "success",
      message: parsed.data.decision === "APPROVED"
        ? "Review record approved. Publication status remains DRAFT."
        : "Review record rejected. No university data was published.",
    };
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Unable to save the review decision." };
  }
}
