import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { ScholarshipRepository } from "../lib/university-intelligence";

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-02-01T00:00:00.000Z");

function scholarshipRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "scholarship-1",
    universityId: "university-1",
    programId: null,
    name: "International Merit Scholarship",
    scholarshipAvailable: "AVAILABLE",
    amountText: "$5,000–$10,000",
    minimumAmount: new Prisma.Decimal(5000),
    maximumAmount: new Prisma.Decimal(10000),
    currency: "USD",
    scholarshipType: "merit",
    studyLevel: "undergraduate",
    entryRoute: "direct",
    eligibilityText: "Applicants must demonstrate strong academic achievement.",
    minimumGpa: new Prisma.Decimal("3.50"),
    isAutomatic: true,
    requiresSeparateApplication: false,
    isRenewable: true,
    renewalCriteria: "Maintain a 3.0 GPA.",
    deadlineText: "December 1, 2027",
    scholarshipUrl: "https://www.auburn.edu/scholarships/merit",
    sourceUrl: "https://www.auburn.edu/scholarships/merit",
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    createdAt,
    updatedAt,
    university: {
      id: "university-1",
      name: "Auburn University",
      slug: "auburn-university",
      country: "USA",
    },
    program: null,
    internalSourceName: "must not leak",
    ...overrides,
  };
}

function repositoryMock(
  records = [scholarshipRecord()],
  total = records.length,
) {
  const calls: Array<{ operation: string; args: Record<string, unknown> }> = [];
  const client = {
    scholarship: {
      findFirst: async (args: Record<string, unknown>) => {
        calls.push({ operation: "findFirst", args });
        return records[0] ?? null;
      },
      findMany: async (args: Record<string, unknown>) => {
        calls.push({ operation: "findMany", args });
        return records;
      },
      count: async (args: Record<string, unknown>) => {
        calls.push({ operation: "count", args });
        return total;
      },
    },
  };
  return {
    repository: new ScholarshipRepository(client as never),
    calls,
  };
}

test("getById defaults to published and converts Decimal values in the DTO", async () => {
  const { repository, calls } = repositoryMock();
  const result = await repository.getById("scholarship-1");

  assert.equal(result?.minimumAmount, 5000);
  assert.equal(result?.maximumAmount, 10000);
  assert.equal(result?.minimumGpa, 3.5);
  assert.equal(result?.scope, "university-wide");
  assert.equal(result?.program, null);
  assert.equal("internalSourceName" in (result ?? {}), false);
  assert.deepEqual(calls[0].args.where, {
    id: "scholarship-1",
    publicationStatus: "PUBLISHED",
  });
});

test("an explicit publication status is not overridden by the public default", async () => {
  const { repository, calls } = repositoryMock([
    scholarshipRecord({ publicationStatus: "DRAFT" }),
  ]);
  await repository.getById("scholarship-1", {
    publicationStatus: "DRAFT",
  });
  await repository.list({ publicationStatus: "DRAFT" });

  assert.deepEqual(calls[0].args.where, {
    id: "scholarship-1",
    publicationStatus: "DRAFT",
  });
  const findMany = calls.find((call) => call.operation === "findMany");
  assert.deepEqual(findMany?.args.where, { publicationStatus: "DRAFT" });
});

test("list applies university and program filters with bounded pagination", async () => {
  const { repository, calls } = repositoryMock([
    scholarshipRecord({
      programId: "program-1",
      program: {
        id: "program-1",
        name: "Accounting",
        slug: "accounting",
        degreeLevel: "Bachelor",
      },
    }),
  ], 125);
  const result = await repository.list({
    universityId: " university-1 ",
    programId: " program-1 ",
    country: " USA ",
    page: 2,
    pageSize: 500,
  });

  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    publicationStatus: "PUBLISHED",
    universityId: "university-1",
    programId: "program-1",
    university: { country: { equals: "USA" } },
  });
  assert.equal(findMany.args.skip, 100);
  assert.equal(findMany.args.take, 100);
  assert.equal(result.items[0].scope, "program-specific");
  assert.equal(result.items[0].program?.id, "program-1");
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 100,
    totalItems: 125,
    totalPages: 2,
  });
});

test("monetary range filtering uses stored amounts without currency conversion", async () => {
  const { repository, calls } = repositoryMock();
  await repository.listByAwardRange(4000, 12000, { country: "USA" });

  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    publicationStatus: "PUBLISHED",
    university: { country: { equals: "USA" } },
    AND: [
      {
        OR: [
          { maximumAmount: { gte: 4000 } },
          {
            AND: [
              { maximumAmount: null },
              { minimumAmount: { gte: 4000 } },
            ],
          },
        ],
      },
      {
        OR: [
          { minimumAmount: { lte: 12000 } },
          {
            AND: [
              { minimumAmount: null },
              { maximumAmount: { lte: 12000 } },
            ],
          },
        ],
      },
    ],
  });
});

test("currently open includes only parseable non-expired deadlines", async () => {
  const records = [
    scholarshipRecord({ id: "future", deadlineText: "December 1, 2027" }),
    scholarshipRecord({ id: "expired", deadlineText: "2025-01-01" }),
    scholarshipRecord({ id: "unknown", deadlineText: "Varies by award" }),
  ];
  const { repository, calls } = repositoryMock(records);
  const result = await repository.listCurrentlyOpen(
    new Date("2026-07-25T00:00:00.000Z"),
  );

  assert.deepEqual(result.items.map((item) => item.id), ["future"]);
  assert.equal(result.pagination.totalItems, 1);
  assert.equal(calls.filter((call) => call.operation === "findMany").length, 1);
  assert.equal(calls.filter((call) => call.operation === "count").length, 0);
});

test("deadline range filtering excludes unknown and out-of-range deadlines", async () => {
  const records = [
    scholarshipRecord({ id: "inside", deadlineText: "2027-06-01" }),
    scholarshipRecord({ id: "outside", deadlineText: "2028-01-01" }),
    scholarshipRecord({ id: "unknown", deadlineText: "Rolling" }),
  ];
  const { repository } = repositoryMock(records);
  const result = await repository.listByDeadlineRange(
    new Date("2027-01-01T00:00:00.000Z"),
    new Date("2027-12-31T23:59:59.999Z"),
  );

  assert.deepEqual(result.items.map((item) => item.id), ["inside"]);
});

test("blank and invalid filters are ignored", async () => {
  const { repository, calls } = repositoryMock();
  await repository.list({
    universityId: " ",
    programId: "",
    country: " ",
    scholarshipType: "",
    minimumAward: -1,
    maximumAward: Number.POSITIVE_INFINITY,
    deadlineFrom: new Date(Number.NaN),
    deadlineTo: new Date(Number.NaN),
    publishedOnly: false,
  });

  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {});
  assert.equal(findMany.args.skip, 0);
  assert.equal(findMany.args.take, 20);
});

test("search inspects scholarship and related public fields in one query", async () => {
  const { repository, calls } = repositoryMock();
  const result = await repository.search({
    query: " Merit ",
    scholarshipType: "merit",
  });

  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    AND: [
      {
        publicationStatus: "PUBLISHED",
        scholarshipType: { equals: "merit" },
      },
      {
        OR: [
          { name: { contains: "Merit" } },
          { scholarshipType: { contains: "Merit" } },
          { eligibilityText: { contains: "Merit" } },
          { amountText: { contains: "Merit" } },
          { studyLevel: { contains: "Merit" } },
          { university: { name: { contains: "Merit" } } },
          { program: { name: { contains: "Merit" } } },
        ],
      },
    ],
  });
  assert.equal(result.items[0].matchedQuery, "Merit");
});
