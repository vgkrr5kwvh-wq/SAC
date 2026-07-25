import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { ProgramRepository } from "../lib/university-intelligence";

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-02-01T00:00:00.000Z");

function programRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "program-1",
    universityId: "university-1",
    name: "Accounting",
    slug: "accounting",
    degreeLevel: "Bachelor",
    studyLevel: "undergraduate",
    award: "BS",
    programType: "major",
    department: "Harbert College of Business",
    subjectArea: "Business",
    deliveryMode: "On campus",
    campus: "Auburn",
    durationText: "4 years",
    creditsText: "120 credit hours",
    isStem: false,
    active: true,
    lastVerifiedAt: updatedAt,
    programUrl: "https://www.auburn.edu/programs/accounting",
    sourceName: "official-university",
    sourceUrl: "https://www.auburn.edu/programs/accounting",
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    createdAt,
    updatedAt,
    university: {
      id: "university-1",
      name: "Auburn University",
      slug: "auburn-university",
      country: "USA",
      state: "Alabama",
      city: "Auburn",
      logoUrl: null,
    },
    tuitionRecords: [{
      id: "tuition-1",
      amount: new Prisma.Decimal(35000),
      currency: "USD",
      period: "academic-year",
      academicYear: "2026-27",
      estimatedCoa: new Prisma.Decimal(52000),
      sourceUrl: "https://www.auburn.edu/cost",
    }],
    scholarships: [{
      id: "scholarship-1",
      name: "Merit Scholarship",
      scholarshipAvailable: "AVAILABLE",
      amountText: "$5,000",
      currency: "USD",
      deadlineText: "February 1",
      sourceUrl: "https://www.auburn.edu/scholarships",
    }],
    intakes: [{
      id: "intake-1",
      term: "Fall",
      month: 8,
      year: 2027,
      deadline: new Date("2027-02-01T00:00:00.000Z"),
      sourceUrl: "https://www.auburn.edu/deadlines",
    }],
    internalValue: "must not leak",
    ...overrides,
  };
}

function repositoryMock(records = [programRecord()], total = records.length) {
  const calls: Array<{ operation: string; args: Record<string, unknown> }> = [];
  const client = {
    program: {
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
    repository: new ProgramRepository(client as never),
    calls,
  };
}

test("getById returns a typed detail DTO and defaults to published", async () => {
  const { repository, calls } = repositoryMock();
  const result = await repository.getById("program-1");
  assert.equal(result?.name, "Accounting");
  assert.equal(result?.startingTuition, 35000);
  assert.equal(result?.tuition[0].estimatedCoa, 52000);
  assert.equal(result?.scholarshipAvailable, true);
  assert.deepEqual(result?.intakeTerms, ["Fall"]);
  assert.equal("internalValue" in (result ?? {}), false);
  assert.deepEqual(calls[0].args.where, {
    id: "program-1",
    publicationStatus: "PUBLISHED",
  });
});

test("getBySlug respects university-scoped slugs and explicit unpublished access", async () => {
  const { repository, calls } = repositoryMock([
    programRecord({ publicationStatus: "DRAFT" }),
  ]);
  await repository.getBySlug(" accounting ", {
    universityId: " university-1 ",
    publishedOnly: false,
  });
  assert.deepEqual(calls[0].args.where, {
    slug: "accounting",
    universityId: "university-1",
  });
  assert.deepEqual(calls[0].args.orderBy, [
    { university: { name: "asc" } },
    { id: "asc" },
  ]);
});

test("list applies relational filters, bounded pagination, and deterministic sorting", async () => {
  const { repository, calls } = repositoryMock([programRecord()], 41);
  const result = await repository.list({
    universityId: " university-1 ",
    country: " USA ",
    degreeLevel: " Bachelor ",
    campus: " Auburn ",
    intake: " Fall ",
    scholarshipAvailable: true,
    tuitionMin: 30000,
    tuitionMax: 40000,
    page: 2,
    pageSize: 500,
    sortBy: "universityName",
    sortDirection: "desc",
  });
  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    publicationStatus: "PUBLISHED",
    universityId: "university-1",
    university: { country: { equals: "USA" } },
    degreeLevel: { equals: "Bachelor" },
    campus: { equals: "Auburn" },
    intakes: { some: { term: { equals: "Fall" } } },
    scholarships: {
      some: {
        scholarshipAvailable: "AVAILABLE",
        publicationStatus: "PUBLISHED",
      },
    },
    tuitionRecords: {
      some: {
        amount: {
          gte: 30000,
          lte: 40000,
        },
      },
    },
  });
  assert.deepEqual(findMany.args.orderBy, [
    { university: { name: "desc" } },
    { id: "asc" },
  ]);
  assert.equal(findMany.args.skip, 100);
  assert.equal(findMany.args.take, 100);
  assert.equal(calls.filter((call) => call.operation === "findMany").length, 1);
  assert.equal(calls.filter((call) => call.operation === "count").length, 1);
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 100,
    totalItems: 41,
    totalPages: 1,
  });
});

test("blank and invalid filters are ignored and publishedOnly can be disabled", async () => {
  const { repository, calls } = repositoryMock();
  await repository.list({
    universityId: " ",
    country: "",
    degreeLevel: " ",
    campus: " ",
    intake: "",
    tuitionMin: -1,
    tuitionMax: Number.NaN,
    publishedOnly: false,
  });
  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {});
});

test("search returns search DTOs and searches program and university fields", async () => {
  const { repository, calls } = repositoryMock();
  const result = await repository.search({
    query: " Accounting ",
    country: "USA",
  });
  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    AND: [
      {
        publicationStatus: "PUBLISHED",
        university: { country: { equals: "USA" } },
      },
      {
        OR: [
          { name: { contains: "Accounting" } },
          { degreeLevel: { contains: "Accounting" } },
          { studyLevel: { contains: "Accounting" } },
          { subjectArea: { contains: "Accounting" } },
          { department: { contains: "Accounting" } },
          { university: { name: { contains: "Accounting" } } },
        ],
      },
    ],
  });
  assert.equal(result.items[0].matchedQuery, "Accounting");
});

test("convenience methods delegate to their corresponding schema filters", async () => {
  const { repository, calls } = repositoryMock();
  await repository.listByUniversity("university-1");
  await repository.listByCountry("USA");
  await repository.listByDegree("Master");
  await repository.listByIntake("Spring");
  await repository.listByScholarship(false);
  await repository.listByTuitionRange(10000, 25000);

  const filters = calls
    .filter((call) => call.operation === "findMany")
    .map((call) => call.args.where);
  assert.deepEqual(filters[0], {
    publicationStatus: "PUBLISHED",
    universityId: "university-1",
  });
  assert.deepEqual(filters[1], {
    publicationStatus: "PUBLISHED",
    university: { country: { equals: "USA" } },
  });
  assert.deepEqual(filters[2], {
    publicationStatus: "PUBLISHED",
    degreeLevel: { equals: "Master" },
  });
  assert.deepEqual(filters[3], {
    publicationStatus: "PUBLISHED",
    intakes: { some: { term: { equals: "Spring" } } },
  });
  assert.deepEqual(filters[4], {
    publicationStatus: "PUBLISHED",
    scholarships: {
      none: {
        scholarshipAvailable: "AVAILABLE",
        publicationStatus: "PUBLISHED",
      },
    },
  });
  assert.deepEqual(filters[5], {
    publicationStatus: "PUBLISHED",
    tuitionRecords: {
      some: {
        amount: {
          gte: 10000,
          lte: 25000,
        },
      },
    },
  });
});
