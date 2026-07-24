import { Prisma, type PrismaClient } from "@prisma/client";
import { deterministicDataHash } from "../hashing";
import { safeErrorMessage, safeImportLog } from "../logging";
import { matchStudiesOverseasSource } from "./match-sources";
import {
  crawlOfficialPages,
  discoverApprovedOfficialPages,
  fetchOfficialPagesWithPlaywright,
  normalizedHostname,
  officialGeneralPageBudget,
  officialProgramDirectoryBudget,
  officialProgramPageBudget,
  type OfficialPageFetcher,
} from "./official-site";
import { extractStructuredOfficialClaims } from "./extractors/claims";
import {
  discoverOfficialProgramLinksWithDiagnostics,
  extractOfficialProgram,
  limitProgramPages,
  qualifyOfficialProgramPage,
} from "./extractors/programs";
import { defaultClaimConfidence, resolveSourceClaims } from "./source-resolution";
import type {
  EnrichmentClaim,
  EnrichmentResult,
  EnrichmentTarget,
  OfficialPageCandidate,
  OfficialPageSnapshot,
} from "./types";

export type EnrichmentDependencies = {
  studiesCatalogHtml: string;
  fetchStudiesProfile: (url: string) => Promise<string>;
  homepage?: OfficialPageSnapshot;
  fetchOfficialPage?: OfficialPageFetcher;
  fetchProgramPage?: OfficialPageFetcher;
  delay?: () => Promise<void>;
};

function discoveryClaims(target: EnrichmentTarget, observedAt: Date): EnrichmentClaim[] {
  const values: Array<[string, unknown]> = [
    ["name", target.name],
    ["country", target.country],
    ["state", target.state],
    ["city", target.city],
    ["officialWebsiteUrl", target.officialWebsiteUrl],
  ];
  return values.flatMap(([fieldName, value]) => value === null ? [] : [{
    entityType: "university" as const,
    entityKey: target.slug,
    programKey: null,
    fieldName,
    value,
    normalizedValue: String(value).toLowerCase(),
    sourceName: "university-study",
    sourceUrl: target.universityStudyUrl ?? "https://universitystudy.com/study-destinations/",
    authorityLevel: "UNIVERSITY_STUDY" as const,
    confidence: defaultClaimConfidence.UNIVERSITY_STUDY,
    observedAt,
    rawEvidenceText: null,
    scopeLabel: "partner-discovery",
    studyLevel: null,
    entryRoute: null,
    academicYear: null,
  }]);
}

async function liveHomepage(target: EnrichmentTarget, verifiedDomain: string): Promise<OfficialPageSnapshot> {
  return (await fetchOfficialPagesWithPlaywright([{
    url: target.officialWebsiteUrl,
    label: "Homepage",
    kind: "homepage",
  }], verifiedDomain, 1))[0];
}

export async function enrichUniversity(
  target: EnrichmentTarget,
  dependencies: EnrichmentDependencies,
): Promise<EnrichmentResult> {
  const observedAt = new Date();
  const verifiedOfficialDomain = normalizedHostname(target.officialWebsiteUrl);
  if (!verifiedOfficialDomain) throw new Error("University has no valid verified official domain.");

  const studiesOverseas = await matchStudiesOverseasSource(
    target,
    dependencies.studiesCatalogHtml,
    dependencies.fetchStudiesProfile,
    observedAt,
  );
  const homepage = dependencies.homepage ?? await liveHomepage(target, verifiedOfficialDomain);
  const discovered = homepage.html
    ? discoverApprovedOfficialPages(homepage.html, homepage.finalUrl, verifiedOfficialDomain)
    : { general: [{ url: target.officialWebsiteUrl, label: "Homepage", kind: "homepage" as const }], programDirectories: [] };
  const officialFetcher = dependencies.fetchOfficialPage
    ?? ((candidate: OfficialPageCandidate) => fetchOfficialPagesWithPlaywright([candidate], verifiedOfficialDomain, 1).then((pages) => pages[0]));
  const remainingGeneral = discovered.general.filter((candidate) => candidate.kind !== "homepage");
  const officialPages = [
    homepage,
    ...await crawlOfficialPages(remainingGeneral, officialFetcher, officialGeneralPageBudget - 1, dependencies.delay),
  ].slice(0, officialGeneralPageBudget);
  const programDirectoryPages = await crawlOfficialPages(
    discovered.programDirectories,
    officialFetcher,
    officialProgramDirectoryBudget,
    dependencies.delay,
  );
  const programDiscovery = discoverOfficialProgramLinksWithDiagnostics(programDirectoryPages, verifiedOfficialDomain);
  const programEntries = limitProgramPages(programDiscovery.entries);
  const programFetcher = dependencies.fetchProgramPage ?? officialFetcher;
  const programPages = await crawlOfficialPages(
    programEntries.map((entry) => ({ url: entry.url, label: entry.name, kind: "program" as const })),
    programFetcher,
    officialProgramPageBudget,
    dependencies.delay,
  );
  const seenFinalProgramUrls = new Set<string>();
  const programQualifications = programPages.map((page, index) => {
    const entry = programEntries[index];
    let finalKey: string;
    try {
      const final = new URL(page.finalUrl);
      finalKey = `${final.hostname.replace(/^www\./, "")}${final.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
    } catch {
      finalKey = page.finalUrl;
    }
    if (seenFinalProgramUrls.has(finalKey)) {
      return { entry, qualification: { qualified: false, heading: null, reason: "Redirected final URL duplicates an earlier selected program page." } };
    }
    seenFinalProgramUrls.add(finalKey);
    return { entry, qualification: qualifyOfficialProgramPage(page, entry) };
  });
  const programs = programPages.flatMap((page, index) => {
    const { entry, qualification } = programQualifications[index];
    if (!qualification.qualified) return [];
    const program = extractOfficialProgram(page, entry);
    return program ? [program] : [];
  });
  const officialClaims = officialPages.flatMap((page) =>
    extractStructuredOfficialClaims(page, target.slug)
  );
  const programClaims = programs.flatMap((program) => program.claims);
  const claims = [
    ...discoveryClaims(target, observedAt),
    ...studiesOverseas.claims,
    ...officialClaims,
    ...programClaims,
  ];
  const resolvedClaims = resolveSourceClaims(claims);
  const officialSuccess = officialPages.some((page) => page.html && page.status < 400);
  const verificationStatus = officialSuccess ? "OFFICIAL_VERIFIED" : "VERIFICATION_FAILED";
  const presentFields = new Set(officialClaims.map((claim) => claim.fieldName));
  const missingFields = [
    "officialName", "city", "state", "address", "institutionType", "foundedYear",
    "undergraduate.ieltsOverall", "graduate.ieltsOverall", "tuition.amount",
    "scholarship.scholarshipAvailable", "intake.deadline",
  ].filter((field) => !presentFields.has(field));
  const allCheckedPages = [...officialPages, ...programDirectoryPages];
  const claimsBySourceEntityField: Record<string, number> = {};
  for (const claim of claims) {
    const key = `${claim.sourceName}|${claim.entityType}|${claim.fieldName}`;
    claimsBySourceEntityField[key] = (claimsBySourceEntityField[key] ?? 0) + 1;
  }
  return {
    universityId: target.id,
    universityName: target.name,
    verifiedOfficialDomain,
    studiesOverseas,
    officialPages,
    programDirectoryPages,
    programs,
    claims,
    resolvedClaims,
    missingFields,
    verificationStatus,
    diagnostics: {
      pages: allCheckedPages.map((page) => ({
        requestedUrl: page.url,
        finalUrl: page.finalUrl,
        status: page.status,
        pageKind: page.kind,
        accessIssue: page.accessIssue,
      })),
      programDirectories: programDiscovery.diagnostics,
      selectedProgramPages: programEntries.map((entry) => ({
        name: entry.name,
        url: entry.url,
        studyLevel: entry.studyLevel,
        programType: entry.programType,
      })),
      attemptedProgramPages: programPages.map((page, index) => ({
        name: programEntries[index].name,
        studyLevel: programEntries[index].studyLevel,
        requestedUrl: page.url,
        finalUrl: page.finalUrl,
        status: page.status,
        accessIssue: page.accessIssue,
        finalPageHeading: programQualifications[index].qualification.heading,
        qualified: programQualifications[index].qualification.qualified,
        qualificationReason: programQualifications[index].qualification.reason,
      })),
      claimsBySourceEntityField,
      conflicts: resolvedClaims
        .filter((group) => group.conflictStatus !== "NONE")
        .map((group) => ({
          fieldName: group.fieldName,
          scope: group.scope,
          reason: group.conflictReason,
        })),
    },
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type PreparedEnrichmentPersistence = {
  startedAt: Date;
  mainRecordData: Omit<Prisma.ImportRecordUncheckedCreateInput, "importJobId">;
  partnerRecordData: Omit<Prisma.ImportRecordUncheckedCreateInput, "importJobId"> | null;
  partnerSourceData: {
    profileUrl: string;
    checkedAt: Date;
    successfulAt: Date | null;
    rawDataHash: string;
  } | null;
  programData: Array<{
    key: string;
    data: Omit<Prisma.ProgramUncheckedCreateInput, "universityId">;
  }>;
  directoryLinks: Array<{
    type: string;
    label: string;
    url: string;
    sourceName: string;
    sourceUrl: string;
  }>;
  claimData: Array<{
    claim: EnrichmentClaim;
    valueJson: Prisma.InputJsonValue;
    isPreferred: boolean;
    conflictStatus: Prisma.UniversityFieldClaimUncheckedCreateInput["conflictStatus"];
  }>;
  conflictCount: number;
};

function prepareEnrichmentPersistence(result: EnrichmentResult): PreparedEnrichmentPersistence {
  const startedAt = new Date();
  const resolvedByKey = new Map(result.resolvedClaims.map((group) => [group.key, group]));
  const claimData = result.claims.map((claim) => {
    const group = resolvedByKey.get([
      claim.entityType, claim.entityKey, claim.programKey ?? "", claim.fieldName,
      claim.studyLevel ?? "", claim.entryRoute ?? "", claim.academicYear ?? "",
    ].join("|"));
    return {
      claim,
      valueJson: json(claim.value),
      isPreferred: group?.preferred === claim
        || Boolean(group?.preferred.sourceUrl === claim.sourceUrl
          && group.preferred.normalizedValue === claim.normalizedValue),
      conflictStatus: group?.conflictStatus ?? "NONE" as const,
    };
  });
  return {
    startedAt,
    mainRecordData: {
      universityId: result.universityId,
      sourceUrl: result.officialPages[0]?.finalUrl ?? "",
      entityType: "university-enrichment",
      entityName: result.universityName,
      status: result.studiesOverseas.status === "MANUAL_REVIEW" ? "MANUAL_REVIEW" : "STAGED",
      rawPayload: json({
        studiesOverseas: result.studiesOverseas.rawPayload,
        officialPages: result.officialPages.map((page) => ({
          url: page.url,
          finalUrl: page.finalUrl,
          label: page.label,
          kind: page.kind,
          status: page.status,
          accessIssue: page.accessIssue,
          checkedAt: page.checkedAt,
        })),
      }),
      normalizedPayload: json(result),
      normalizedDataHash: deterministicDataHash(result),
      missingFields: json(result.missingFields),
      validationErrors: [],
      enrichmentMetadata: json({
        verifiedFactualSource: "Official University Website",
        discoveredThrough: "University Study",
        secondaryComparison: "Studies Overseas",
        officialPagesChecked: result.officialPages.map((page) => ({
          url: page.finalUrl,
          checkedAt: page.checkedAt,
          status: page.status,
          accessIssue: page.accessIssue,
        })),
        programDirectoryPages: result.programDirectoryPages.map((page) => page.finalUrl),
      }),
    },
    partnerRecordData: result.studiesOverseas.profileUrl ? {
      universityId: result.universityId,
      sourceUrl: result.studiesOverseas.profileUrl,
      entityType: "source-snapshot",
      entityName: result.universityName,
      status: "STAGED",
      rawPayload: json(result.studiesOverseas.rawPayload),
      normalizedPayload: json(result.studiesOverseas.normalizedPayload),
    } : null,
    partnerSourceData: result.studiesOverseas.profileUrl ? {
      profileUrl: result.studiesOverseas.profileUrl,
      checkedAt: startedAt,
      successfulAt: result.studiesOverseas.status === "MATCHED" ? startedAt : null,
      rawDataHash: deterministicDataHash(result.studiesOverseas.normalizedPayload),
    } : null,
    programData: result.programs.map((program) => ({
      key: program.key,
      data: {
        name: program.name,
        slug: program.slug,
        degreeLevel: program.degreeLevel,
        studyLevel: program.studyLevel,
        award: program.award,
        programType: program.programType,
        department: program.department,
        deliveryMode: program.deliveryMode,
        campus: program.campus,
        durationText: program.durationText,
        creditsText: program.creditsText,
        isStem: program.isStem,
        active: program.active,
        programUrl: program.officialProgramUrl,
        sourceName: "official-university",
        sourceUrl: program.officialProgramUrl,
        publicationStatus: "DRAFT",
        verificationStatus: "DISCOVERED",
      },
    })),
    directoryLinks: result.programDirectoryPages.map((page) => ({
      type: page.kind,
      label: page.label,
      url: page.finalUrl,
      sourceName: "official-university",
      sourceUrl: page.finalUrl,
    })),
    claimData,
    conflictCount: claimData.filter((item) => item.conflictStatus !== "NONE").length,
  };
}

export async function persistEnrichment(
  database: PrismaClient,
  result: EnrichmentResult,
): Promise<{ importJobId: string; importRecordId: string }> {
  const prepared = prepareEnrichmentPersistence(result);
  safeImportLog("university-enrichment-transaction-started", {
    universityId: result.universityId,
    programWrites: prepared.programData.length,
    claimWrites: prepared.claimData.length,
    conflictWrites: prepared.conflictCount,
  });
  try {
    const persisted = await database.$transaction(async (transaction) => {
      const job = await transaction.importJob.create({
        data: {
          sourceName: "university-enrichment",
          status: "COMPLETED",
          mode: "ENRICHMENT",
          startedAt: prepared.startedAt,
          completedAt: prepared.startedAt,
          discoveredCount: 1,
          importedCount: 1,
        },
      });
      const mainRecord = await transaction.importRecord.create({
        data: {
          ...prepared.mainRecordData,
          importJobId: job.id,
        },
      });
      if (prepared.partnerSourceData && prepared.partnerRecordData) {
        await transaction.universitySource.upsert({
          where: { universityId_sourceName: { universityId: result.universityId, sourceName: "studies-overseas" } },
          update: {
            sourceUniversityUrl: prepared.partnerSourceData.profileUrl,
            lastCheckedAt: prepared.partnerSourceData.checkedAt,
            lastSuccessfulSyncAt: prepared.partnerSourceData.successfulAt ?? undefined,
          },
          create: {
            universityId: result.universityId,
            sourceName: "studies-overseas",
            sourceUniversityUrl: prepared.partnerSourceData.profileUrl,
            lastCheckedAt: prepared.partnerSourceData.checkedAt,
            lastSuccessfulSyncAt: prepared.partnerSourceData.successfulAt,
            rawDataHash: prepared.partnerSourceData.rawDataHash,
            isPrimary: false,
          },
        });
        await transaction.importRecord.create({
          data: {
            ...prepared.partnerRecordData,
            importJobId: job.id,
          },
        });
      }
      const programIds = new Map<string, string>();
      for (const program of prepared.programData) {
        const stored = await transaction.program.upsert({
          where: { universityId_slug: { universityId: result.universityId, slug: program.data.slug } },
          update: {
            ...program.data,
            slug: undefined,
          },
          create: {
            ...program.data,
            universityId: result.universityId,
          },
        });
        programIds.set(program.key, stored.id);
      }
      for (const link of prepared.directoryLinks) {
        const existing = await transaction.universityLink.findFirst({
          where: { universityId: result.universityId, type: link.type, url: link.url },
        });
        if (!existing) await transaction.universityLink.create({
          data: {
            universityId: result.universityId,
            ...link,
          },
        });
      }
      if (prepared.claimData.length) {
        await transaction.universityFieldClaim.createMany({
          data: prepared.claimData.map(({ claim, valueJson, isPreferred, conflictStatus }) => ({
            universityId: result.universityId,
            importRecordId: mainRecord.id,
            programId: claim.programKey ? programIds.get(claim.programKey) ?? null : null,
            entityType: claim.entityType,
            entityId: null,
            fieldName: claim.fieldName,
            valueJson,
            normalizedValue: claim.normalizedValue,
            sourceName: claim.sourceName,
            sourceUrl: claim.sourceUrl,
            authorityLevel: claim.authorityLevel,
            confidence: claim.confidence,
            observedAt: claim.observedAt,
            rawEvidenceText: claim.rawEvidenceText,
            isPreferred,
            conflictStatus,
            scopeLabel: claim.scopeLabel,
            studyLevel: claim.studyLevel,
            entryRoute: claim.entryRoute,
            academicYear: claim.academicYear,
          })),
        });
      }
      return { importJobId: job.id, importRecordId: mainRecord.id };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 10_000,
      timeout: 30_000,
    });
    safeImportLog("university-enrichment-transaction-committed", {
      universityId: result.universityId,
      importJobId: persisted.importJobId,
      importRecordId: persisted.importRecordId,
      programWrites: prepared.programData.length,
      claimWrites: prepared.claimData.length,
      conflictWrites: prepared.conflictCount,
    });
    return persisted;
  } catch (error) {
    safeImportLog("university-enrichment-transaction-rolled-back", {
      universityId: result.universityId,
      programWrites: prepared.programData.length,
      claimWrites: prepared.claimData.length,
      conflictWrites: prepared.conflictCount,
      error: safeErrorMessage(error),
    });
    throw error;
  }
}

export async function executeEnrichment(
  options: { dryRun: boolean },
  target: EnrichmentTarget,
  dependencies: EnrichmentDependencies,
  database?: PrismaClient,
): Promise<EnrichmentResult> {
  const result = await enrichUniversity(target, dependencies);
  if (!options.dryRun) {
    if (!database) throw new Error("A database client is required for live enrichment.");
    await persistEnrichment(database, result);
  }
  return result;
}
