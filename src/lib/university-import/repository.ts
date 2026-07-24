import { Prisma, type PrismaClient } from "@prisma/client";
import { normalizeUniversityName } from "./normalizers";
import type { DeduplicationDecision, ExistingPrismaUniversityCandidate } from "./deduplication";
import type { NormalizedUniversityRecord, RawExtractedUniversity, UniversityValidationResult } from "./types";

export type PersistImportInput = {
  importJobId: string;
  raw: RawExtractedUniversity;
  normalized: NormalizedUniversityRecord;
  validation: UniversityValidationResult;
  hash: string;
  deduplication: DeduplicationDecision;
};

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export async function findUniversityCandidates(
  database: PrismaClient,
  normalized: NormalizedUniversityRecord,
): Promise<ExistingPrismaUniversityCandidate[]> {
  const terms = [normalized.name, ...normalized.aliases];
  const records = await database.university.findMany({
    where: {
      OR: [
        { name: { in: terms } },
        ...(normalized.city ? [{ city: normalized.city }] : []),
        ...(normalized.state ? [{ state: normalized.state }] : []),
        ...(normalized.officialWebsiteUrl ? [{ officialWebsiteUrl: normalized.officialWebsiteUrl }] : []),
        { aliases: { some: { normalizedName: { in: terms.map(normalizeUniversityName) } } } },
      ],
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      officialWebsiteUrl: true,
      aliases: { select: { name: true } },
    },
    take: 25,
  });
  return records.map((record) => ({ ...record, aliases: record.aliases.map((alias) => alias.name) }));
}

export async function persistImportRecord(
  database: PrismaClient,
  input: PersistImportInput,
): Promise<"imported" | "updated" | "skipped" | "manual-review"> {
  return database.$transaction(async (transaction) => {
    const existingSource = await transaction.universitySource.findFirst({
      where: {
        sourceName: input.normalized.sourceName,
        sourceUniversityUrl: input.normalized.sourceUniversityUrl,
      },
      select: { id: true, universityId: true, rawDataHash: true },
    });
    if (existingSource?.rawDataHash === input.hash) {
      await transaction.universitySource.update({
        where: { id: existingSource.id },
        data: { lastCheckedAt: new Date() },
      });
      await transaction.importRecord.create({
        data: {
          importJobId: input.importJobId,
          sourceUrl: input.normalized.sourceUniversityUrl,
          entityType: "university",
          entityName: input.normalized.name,
          status: "SKIPPED",
          rawPayload: json(input.raw),
          normalizedPayload: json(input.normalized),
          normalizedDataHash: input.hash,
          missingFields: json(input.validation.missingFields),
          validationErrors: json(input.validation.errors),
        },
      });
      return "skipped";
    }
    if (input.deduplication.kind === "MANUAL_REVIEW") {
      await transaction.importRecord.create({
        data: {
          importJobId: input.importJobId,
          sourceUrl: input.normalized.sourceUniversityUrl,
          entityType: "university",
          entityName: input.normalized.name,
          status: "MANUAL_REVIEW",
          rawPayload: json(input.raw),
          normalizedPayload: json(input.normalized),
          normalizedDataHash: input.hash,
          missingFields: json(input.validation.missingFields),
          validationErrors: json(input.validation.errors),
          duplicateWarning: input.deduplication.warning,
          duplicateUniversityId: input.deduplication.universityId,
        },
      });
      return "manual-review";
    }

    const targetUniversityId = existingSource?.universityId
      ?? (input.deduplication.kind === "AUTO_MATCH" ? input.deduplication.universityId : null);
    const universityData = {
      name: input.normalized.name,
      country: input.normalized.country,
      state: input.normalized.state,
      city: input.normalized.city,
      address: input.normalized.address,
      institutionType: input.normalized.institutionType,
      foundedYear: input.normalized.foundedYear,
      description: input.normalized.description,
      officialWebsiteUrl: input.normalized.officialWebsiteUrl,
      logoUrl: input.normalized.logoUrl,
      bannerImageUrl: input.normalized.bannerImageUrl,
      publicationStatus: "DRAFT" as const,
    };
    const university = targetUniversityId
      ? await transaction.university.update({ where: { id: targetUniversityId }, data: universityData })
      : await transaction.university.create({
        data: { ...universityData, slug: input.normalized.slug },
      });
    if (existingSource) {
      await transaction.universitySource.update({
        where: { id: existingSource.id },
        data: {
          lastCheckedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
          rawDataHash: input.hash,
        },
      });
    } else {
      await transaction.universitySource.create({
        data: {
          universityId: university.id,
          sourceName: input.normalized.sourceName,
          sourceUniversityUrl: input.normalized.sourceUniversityUrl,
          sourceExternalId: input.normalized.sourceExternalId,
          lastCheckedAt: new Date(),
          lastSuccessfulSyncAt: new Date(),
          rawDataHash: input.hash,
          isPrimary: input.deduplication.kind === "NEW",
        },
      });
    }

    for (const alias of input.normalized.aliases) {
      const normalizedName = normalizeUniversityName(alias);
      if (!normalizedName) continue;
      await transaction.universityAlias.upsert({
        where: { universityId_normalizedName: { universityId: university.id, normalizedName } },
        update: { name: alias, sourceName: input.normalized.sourceName, sourceUrl: input.normalized.sourceUniversityUrl },
        create: { universityId: university.id, name: alias, normalizedName, sourceName: input.normalized.sourceName, sourceUrl: input.normalized.sourceUniversityUrl },
      });
    }
    for (const program of input.normalized.programs) {
      await transaction.program.upsert({
        where: { universityId_slug: { universityId: university.id, slug: program.slug } },
        update: { ...program, sourceName: input.normalized.sourceName, publicationStatus: "DRAFT" },
        create: { ...program, universityId: university.id, sourceName: input.normalized.sourceName, publicationStatus: "DRAFT" },
      });
    }
    await transaction.admissionRequirement.deleteMany({ where: { universityId: university.id, sourceName: input.normalized.sourceName } });
    for (const requirement of input.normalized.admissionRequirements) {
      await transaction.admissionRequirement.create({
        data: {
          universityId: university.id,
          studyLevel: stringValue(requirement.studyLevel),
          minimumGpa: numberValue(requirement.minimumGpa),
          academicRequirementText: stringValue(requirement.academicRequirementText),
          ieltsOverall: numberValue(requirement.ieltsOverall),
          toeflOverall: numberValue(requirement.toeflOverall),
          pteOverall: numberValue(requirement.pteOverall),
          duolingoOverall: numberValue(requirement.duolingoOverall),
          greRequired: booleanValue(requirement.greRequired),
          gmatRequired: booleanValue(requirement.gmatRequired),
          satRequired: booleanValue(requirement.satRequired),
          applicationFee: numberValue(requirement.applicationFee),
          currency: stringValue(requirement.currency),
          requirementUrl: stringValue(requirement.requirementUrl),
          sourceName: input.normalized.sourceName,
          sourceUrl: input.normalized.sourceUniversityUrl,
        },
      });
    }
    await transaction.tuition.deleteMany({ where: { universityId: university.id, sourceName: input.normalized.sourceName } });
    for (const tuition of input.normalized.tuition) {
      await transaction.tuition.create({
        data: {
          universityId: university.id,
          studyLevel: stringValue(tuition.studyLevel),
          amount: numberValue(tuition.amount),
          currency: stringValue(tuition.currency),
          period: stringValue(tuition.period),
          livingCost: numberValue(tuition.livingCost),
          insuranceCost: numberValue(tuition.insuranceCost),
          otherFees: numberValue(tuition.otherFees),
          estimatedCoa: numberValue(tuition.estimatedCoa),
          tuitionUrl: stringValue(tuition.tuitionUrl),
          academicYear: stringValue(tuition.academicYear),
          sourceName: input.normalized.sourceName,
          sourceUrl: input.normalized.sourceUniversityUrl,
        },
      });
    }
    await transaction.scholarship.deleteMany({ where: { universityId: university.id, sourceName: input.normalized.sourceName } });
    for (const scholarship of input.normalized.scholarships) {
      await transaction.scholarship.create({
        data: {
          ...scholarship,
          universityId: university.id,
          sourceName: input.normalized.sourceName,
          publicationStatus: "DRAFT",
        },
      });
    }
    await transaction.intake.deleteMany({ where: { universityId: university.id, sourceName: input.normalized.sourceName } });
    for (const intake of input.normalized.intakes) {
      const term = stringValue(intake.term);
      if (!term) continue;
      await transaction.intake.create({
        data: {
          universityId: university.id,
          term,
          month: numberValue(intake.month),
          year: numberValue(intake.year),
          deadline: stringValue(intake.deadline) ? new Date(String(intake.deadline)) : null,
          intakeUrl: stringValue(intake.intakeUrl),
          sourceName: input.normalized.sourceName,
          sourceUrl: input.normalized.sourceUniversityUrl,
        },
      });
    }
    for (const link of input.normalized.links) {
      const existingLink = await transaction.universityLink.findFirst({
        where: { universityId: university.id, type: link.type, url: link.url },
        select: { id: true },
      });
      if (existingLink) {
        await transaction.universityLink.update({
          where: { id: existingLink.id },
          data: { label: link.label, sourceName: input.normalized.sourceName, sourceUrl: link.sourceUrl },
        });
      } else {
        await transaction.universityLink.create({
          data: { ...link, universityId: university.id, sourceName: input.normalized.sourceName },
        });
      }
    }
    const result = targetUniversityId ? "updated" : "imported";
    await transaction.importRecord.create({
      data: {
        importJobId: input.importJobId,
        sourceUrl: input.normalized.sourceUniversityUrl,
        entityType: "university",
        entityName: input.normalized.name,
        status: "STAGED",
        rawPayload: json(input.raw),
        normalizedPayload: json(input.normalized),
        normalizedDataHash: input.hash,
        missingFields: json(input.validation.missingFields),
        validationErrors: json(input.validation.errors),
      },
    });
    return result;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
