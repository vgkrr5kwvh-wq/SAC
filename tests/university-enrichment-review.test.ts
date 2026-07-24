import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { materializeApprovedEnrichment } from "../app/admin/university-data/actions";

test("approval materializes all Auburn review domains with source attribution and no publication", async () => {
  const writes: Array<{ model: string; operation: string; data: Record<string, unknown> }> = [];
  const record = (model: string, operation: string, args: { data?: Record<string, unknown> }) => {
    writes.push({ model, operation, data: args.data ?? {} });
    return { id: `${model}-1` };
  };
  const transaction = {
    university: {
      update: (args: { data: Record<string, unknown> }) => record("university", "update", args),
    },
    admissionRequirement: {
      findFirst: async () => null,
      create: (args: { data: Record<string, unknown> }) => record("admissionRequirement", "create", args),
      update: (args: { data: Record<string, unknown> }) => record("admissionRequirement", "update", args),
    },
    tuition: {
      create: (args: { data: Record<string, unknown> }) => record("tuition", "create", args),
    },
    scholarship: {
      create: (args: { data: Record<string, unknown> }) => record("scholarship", "create", args),
    },
    intake: {
      create: (args: { data: Record<string, unknown> }) => record("intake", "create", args),
    },
  } as unknown as Prisma.TransactionClient;

  const sourceUrl = "https://www.auburn.edu/official-facts";
  await materializeApprovedEnrichment(transaction, "auburn-id", [
    {
      programId: null,
      entityType: "university",
      fieldName: "officialName",
      valueJson: "Auburn University",
      sourceName: "official-university",
      sourceUrl,
      studyLevel: null,
      entryRoute: null,
      academicYear: null,
      isPreferred: true,
    },
    {
      programId: "mba-id",
      entityType: "admission-requirement",
      fieldName: "ieltsOverall",
      valueJson: 7,
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/programs/mba/requirements",
      studyLevel: "graduate",
      entryRoute: "direct",
      academicYear: null,
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "tuition",
      fieldName: "amount",
      valueJson: 35000,
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/cost",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: "2026-27",
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "tuition",
      fieldName: "currency",
      valueJson: "USD",
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/cost",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: "2026-27",
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "scholarship",
      fieldName: "scholarshipAvailable",
      valueJson: true,
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/scholarships",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: null,
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "scholarship",
      fieldName: "name",
      valueJson: "Auburn University Scholarship",
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/scholarships",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: null,
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "intake",
      fieldName: "term",
      valueJson: "Fall",
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/deadlines",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: "2026-27",
      isPreferred: true,
    },
    {
      programId: null,
      entityType: "intake",
      fieldName: "deadline",
      valueJson: "2026-02-01",
      sourceName: "official-university",
      sourceUrl: "https://www.auburn.edu/deadlines",
      studyLevel: "undergraduate",
      entryRoute: "direct",
      academicYear: "2026-27",
      isPreferred: true,
    },
  ]);

  assert.deepEqual(
    new Set(writes.map((write) => write.model)),
    new Set(["university", "admissionRequirement", "tuition", "scholarship", "intake"]),
  );
  for (const write of writes.filter((item) => item.model !== "university")) {
    assert.equal(write.data.sourceName, "official-university");
    assert.match(String(write.data.sourceUrl), /^https:\/\/www\.auburn\.edu\//);
    assert.equal(write.data.verificationStatus, "OFFICIAL_VERIFIED");
  }
  const scholarship = writes.find((write) => write.model === "scholarship");
  assert.equal(scholarship?.data.publicationStatus, "DRAFT");
  assert.equal(scholarship?.data.scholarshipAvailable, "AVAILABLE");
  const programRequirement = writes.find((write) => write.model === "admissionRequirement");
  assert.equal(programRequirement?.data.programId, "mba-id");
  assert.equal(programRequirement?.data.ieltsOverall, 7);
  assert.equal(writes.some((write) => write.data.publicationStatus === "PUBLISHED"), false);
});
