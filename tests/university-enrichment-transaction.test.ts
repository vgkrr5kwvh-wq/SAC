import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  executeEnrichment,
  persistEnrichment,
} from "../src/lib/university-import/enrichment/runner";
import type {
  EnrichmentClaim,
  EnrichmentResult,
  EnrichmentTarget,
} from "../src/lib/university-import/enrichment/types";

const observedAt = new Date("2026-07-25T00:00:00.000Z");
const target: EnrichmentTarget = {
  id: "cm12345678901234567890123",
  name: "Auburn University",
  slug: "auburn-university",
  country: "USA",
  state: "Alabama",
  city: "Auburn",
  officialWebsiteUrl: "https://www.auburn.edu/",
  verificationStatus: "DISCOVERED",
  aliases: [],
  universityStudyUrl: "https://universitystudy.com/study-destinations/",
};

function claim(fieldName: string, value: unknown, programKey: string | null = null): EnrichmentClaim {
  return {
    entityType: programKey ? "program" : "university",
    entityKey: programKey ?? target.slug,
    programKey,
    fieldName,
    value,
    normalizedValue: String(value).toLowerCase(),
    sourceName: "official-university",
    sourceUrl: "https://www.auburn.edu/official",
    authorityLevel: "OFFICIAL_UNIVERSITY",
    confidence: 95,
    observedAt,
    rawEvidenceText: null,
    scopeLabel: null,
    studyLevel: programKey ? "undergraduate" : null,
    entryRoute: "direct",
    academicYear: null,
  };
}

function persistenceResult(): EnrichmentResult {
  const claims = [claim("officialName", "Auburn University"), claim("name", "Accounting", "accounting-key")];
  return {
    universityId: target.id,
    universityName: target.name,
    verifiedOfficialDomain: "auburn.edu",
    studiesOverseas: {
      status: "NOT_FOUND",
      profileUrl: null,
      reason: "Fixture",
      rawPayload: null,
      normalizedPayload: null,
      claims: [],
    },
    officialPages: [{
      url: target.officialWebsiteUrl,
      finalUrl: target.officialWebsiteUrl,
      label: "Homepage",
      kind: "homepage",
      status: 200,
      html: "<main><h1>Auburn University</h1></main>",
      accessIssue: null,
      checkedAt: observedAt,
    }],
    programDirectoryPages: [],
    programs: [{
      key: "accounting-key",
      name: "Accounting",
      slug: "accounting-undergraduate-major",
      studyLevel: "undergraduate",
      degreeLevel: "Bachelor of Science",
      award: "BS",
      programType: "major",
      department: "Business",
      officialProgramUrl: "https://www.auburn.edu/programs/accounting",
      deliveryMode: null,
      campus: null,
      durationText: null,
      creditsText: "120 credit hours",
      isStem: null,
      active: true,
      lastVerifiedAt: observedAt,
      verificationStatus: "OFFICIAL_VERIFIED",
      claims: [claims[1]],
    }],
    claims,
    resolvedClaims: claims.map((item) => ({
      key: [
        item.entityType, item.entityKey, item.programKey ?? "", item.fieldName,
        item.studyLevel ?? "", item.entryRoute ?? "", item.academicYear ?? "",
      ].join("|"),
      fieldName: item.fieldName,
      scope: "fixture",
      preferred: item,
      competing: [],
      conflictStatus: "NONE",
      conflictReason: null,
    })),
    missingFields: [],
    verificationStatus: "OFFICIAL_VERIFIED",
    diagnostics: {
      pages: [],
      programDirectories: [],
      selectedProgramPages: [],
      attemptedProgramPages: [],
      claimsBySourceEntityField: {},
      conflicts: [],
    },
  };
}

function transactionDatabase(options: {
  failClaimWrites?: boolean;
  onTransactionStart?: () => void;
} = {}) {
  const state = {
    committed: [] as string[],
    transactionOptions: null as Record<string, unknown> | null,
    escapedTransaction: null as Record<string, unknown> | null,
  };
  const database = new Proxy({
    async $transaction(
      callback: (transaction: Record<string, unknown>) => Promise<unknown>,
      transactionOptions: Record<string, unknown>,
    ) {
      options.onTransactionStart?.();
      state.transactionOptions = transactionOptions;
      const staged: string[] = [];
      let active = true;
      const operation = (name: string, result: unknown = {}) => async () => {
        if (!active) throw new Error("Transaction client escaped its callback.");
        staged.push(name);
        return result;
      };
      const transaction = {
        importJob: { create: operation("importJob.create", { id: "job-1" }) },
        importRecord: { create: operation("importRecord.create", { id: "record-1" }) },
        universitySource: { upsert: operation("universitySource.upsert") },
        program: { upsert: operation("program.upsert", { id: "program-1" }) },
        universityLink: {
          findFirst: operation("universityLink.findFirst", null),
          create: operation("universityLink.create"),
        },
        universityFieldClaim: {
          createMany: async () => {
            if (!active) throw new Error("Transaction client escaped its callback.");
            staged.push("universityFieldClaim.createMany");
            if (options.failClaimWrites) throw new Error("Simulated claim write failure.");
            return { count: 2 };
          },
        },
      };
      state.escapedTransaction = transaction;
      try {
        const result = await callback(transaction);
        state.committed.push(...staged);
        return result;
      } finally {
        active = false;
      }
    },
  }, {
    get(target, property, receiver) {
      if (property !== "$transaction") throw new Error(`Root Prisma client used for ${String(property)}.`);
      return Reflect.get(target, property, receiver);
    },
  });
  return { database: database as unknown as PrismaClient, state };
}

test("atomic persistence uses only tx, commits all writes, and bounds the transaction", async () => {
  const { database, state } = transactionDatabase();
  const persisted = await persistEnrichment(database, persistenceResult());
  assert.deepEqual(persisted, { importJobId: "job-1", importRecordId: "record-1" });
  assert.deepEqual(state.transactionOptions, {
    isolationLevel: "Serializable",
    maxWait: 10_000,
    timeout: 30_000,
  });
  assert.deepEqual(state.committed, [
    "importJob.create",
    "importRecord.create",
    "program.upsert",
    "universityLink.findFirst",
    "universityLink.create",
    "universityFieldClaim.createMany",
  ]);
  await assert.rejects(
    async () => (state.escapedTransaction!.importJob as { create: () => Promise<unknown> }).create(),
    /escaped/,
  );
});

test("rollback leaves no partial enrichment when a batched claim write fails", async () => {
  const { database, state } = transactionDatabase({ failClaimWrites: true });
  await assert.rejects(persistEnrichment(database, persistenceResult()), /Simulated claim write failure/);
  assert.deepEqual(state.committed, []);
});

test("crawler and claim preparation finish before the transaction starts", async () => {
  let crawlerCompleted = false;
  const { database } = transactionDatabase({
    onTransactionStart: () => assert.equal(crawlerCompleted, true),
  });
  const homepage = `
    <main><a href="/cost">Cost of Attendance</a></main>
  `;
  await executeEnrichment({ dryRun: false }, target, {
    studiesCatalogHtml: "<main></main>",
    fetchStudiesProfile: async () => {
      throw new Error("No partner profile should be requested.");
    },
    homepage: {
      url: target.officialWebsiteUrl,
      finalUrl: target.officialWebsiteUrl,
      label: "Homepage",
      kind: "homepage",
      status: 200,
      html: homepage,
      accessIssue: null,
      checkedAt: observedAt,
    },
    fetchOfficialPage: async (candidate) => {
      crawlerCompleted = true;
      return {
        ...candidate,
        finalUrl: candidate.url,
        status: 200,
        html: "<main><h1>Cost of Attendance</h1><p>Tuition: $35,000</p></main>",
        accessIssue: null,
        checkedAt: observedAt,
      };
    },
    delay: async () => undefined,
  }, database);
});

test("dry-run never opens a transaction or performs a Prisma write", async () => {
  let transactionCalls = 0;
  const database = {
    $transaction: async () => {
      transactionCalls += 1;
      throw new Error("Dry-run must not open a transaction.");
    },
  };
  await executeEnrichment({ dryRun: true }, target, {
    studiesCatalogHtml: "<main></main>",
    fetchStudiesProfile: async () => "",
    homepage: {
      url: target.officialWebsiteUrl,
      finalUrl: target.officialWebsiteUrl,
      label: "Homepage",
      kind: "homepage",
      status: 200,
      html: "<main><h1>Auburn University</h1></main>",
      accessIssue: null,
      checkedAt: observedAt,
    },
    delay: async () => undefined,
  }, database as unknown as PrismaClient);
  assert.equal(transactionCalls, 0);
});
