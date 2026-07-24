import { Prisma, type PrismaClient } from "@prisma/client";
import { deterministicDataHash } from "../hashing";
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
  discoverOfficialProgramLinks,
  extractOfficialProgram,
  limitProgramPages,
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
  const programEntries = limitProgramPages(discoverOfficialProgramLinks(programDirectoryPages, verifiedOfficialDomain));
  const programFetcher = dependencies.fetchProgramPage ?? officialFetcher;
  const programPages = await crawlOfficialPages(
    programEntries.map((entry) => ({ url: entry.url, label: entry.name, kind: "program" as const })),
    programFetcher,
    officialProgramPageBudget,
    dependencies.delay,
  );
  const programs = programPages.flatMap((page, index) => {
    const program = extractOfficialProgram(page, programEntries[index]);
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
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function persistEnrichment(
  database: PrismaClient,
  result: EnrichmentResult,
): Promise<{ importJobId: string; importRecordId: string }> {
  return database.$transaction(async (transaction) => {
    const job = await transaction.importJob.create({
      data: {
        sourceName: "university-enrichment",
        status: "COMPLETED",
        mode: "ENRICHMENT",
        startedAt: new Date(),
        completedAt: new Date(),
        discoveredCount: 1,
        importedCount: 1,
      },
    });
    const mainRecord = await transaction.importRecord.create({
      data: {
        importJobId: job.id,
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
          officialPagesChecked: result.officialPages.map((page) => ({ url: page.finalUrl, checkedAt: page.checkedAt, status: page.status, accessIssue: page.accessIssue })),
          programDirectoryPages: result.programDirectoryPages.map((page) => page.finalUrl),
        }),
      },
    });
    if (result.studiesOverseas.profileUrl) {
      await transaction.universitySource.upsert({
        where: { universityId_sourceName: { universityId: result.universityId, sourceName: "studies-overseas" } },
        update: {
          sourceUniversityUrl: result.studiesOverseas.profileUrl,
          lastCheckedAt: new Date(),
          lastSuccessfulSyncAt: result.studiesOverseas.status === "MATCHED" ? new Date() : undefined,
        },
        create: {
          universityId: result.universityId,
          sourceName: "studies-overseas",
          sourceUniversityUrl: result.studiesOverseas.profileUrl,
          lastCheckedAt: new Date(),
          lastSuccessfulSyncAt: result.studiesOverseas.status === "MATCHED" ? new Date() : null,
          rawDataHash: deterministicDataHash(result.studiesOverseas.normalizedPayload),
          isPrimary: false,
        },
      });
      await transaction.importRecord.create({
        data: {
          importJobId: job.id,
          universityId: result.universityId,
          sourceUrl: result.studiesOverseas.profileUrl,
          entityType: "source-snapshot",
          entityName: result.universityName,
          status: "STAGED",
          rawPayload: json(result.studiesOverseas.rawPayload),
          normalizedPayload: json(result.studiesOverseas.normalizedPayload),
        },
      });
    }
    const programIds = new Map<string, string>();
    for (const program of result.programs) {
      const stored = await transaction.program.upsert({
        where: { universityId_slug: { universityId: result.universityId, slug: program.slug } },
        update: {
          name: program.name,
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
        create: {
          universityId: result.universityId,
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
      });
      programIds.set(program.key, stored.id);
    }
    for (const page of result.programDirectoryPages) {
      const existing = await transaction.universityLink.findFirst({
        where: { universityId: result.universityId, type: page.kind, url: page.finalUrl },
      });
      if (!existing) await transaction.universityLink.create({
        data: {
          universityId: result.universityId,
          type: page.kind,
          label: page.label,
          url: page.finalUrl,
          sourceName: "official-university",
          sourceUrl: page.finalUrl,
        },
      });
    }
    const resolvedByKey = new Map(result.resolvedClaims.map((group) => [group.key, group]));
    for (const claim of result.claims) {
      const group = resolvedByKey.get([
        claim.entityType, claim.entityKey, claim.programKey ?? "", claim.fieldName,
        claim.studyLevel ?? "", claim.entryRoute ?? "", claim.academicYear ?? "",
      ].join("|"));
      await transaction.universityFieldClaim.create({
        data: {
          universityId: result.universityId,
          importRecordId: mainRecord.id,
          programId: claim.programKey ? programIds.get(claim.programKey) ?? null : null,
          entityType: claim.entityType,
          entityId: null,
          fieldName: claim.fieldName,
          valueJson: json(claim.value),
          normalizedValue: claim.normalizedValue,
          sourceName: claim.sourceName,
          sourceUrl: claim.sourceUrl,
          authorityLevel: claim.authorityLevel,
          confidence: claim.confidence,
          observedAt: claim.observedAt,
          rawEvidenceText: claim.rawEvidenceText,
          isPreferred: group?.preferred === claim || group?.preferred.sourceUrl === claim.sourceUrl && group.preferred.normalizedValue === claim.normalizedValue,
          conflictStatus: group?.conflictStatus ?? "NONE",
          scopeLabel: claim.scopeLabel,
          studyLevel: claim.studyLevel,
          entryRoute: claim.entryRoute,
          academicYear: claim.academicYear,
        },
      });
    }
    return { importJobId: job.id, importRecordId: mainRecord.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
