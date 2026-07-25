import assert from "node:assert/strict";
import test from "node:test";
import { UniversityRepository } from "../lib/university-intelligence";

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-02-01T00:00:00.000Z");

function universityRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "university-1",
    name: "Auburn University",
    slug: "auburn-university",
    country: "USA",
    state: "Alabama",
    city: "Auburn",
    address: "Auburn, Alabama",
    institutionType: "Public",
    foundedYear: 1856,
    description: "Official university description.",
    officialWebsiteUrl: "https://www.auburn.edu/",
    logoUrl: "https://www.auburn.edu/logo.png",
    bannerImageUrl: null,
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    createdAt,
    updatedAt,
    _count: { programs: 4 },
    links: [],
    admissionRequirements: [],
    internalFieldThatMustNotLeak: "internal",
    ...overrides,
  };
}

function repositoryMock(records = [universityRecord()], total = records.length) {
  const calls: Array<{ operation: string; args: Record<string, unknown> }> = [];
  const client = {
    university: {
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
    repository: new UniversityRepository(client as never),
    calls,
  };
}

test("getById and getBySlug default to published DTO reads", async () => {
  const { repository, calls } = repositoryMock();
  const byId = await repository.getById("university-1");
  const bySlug = await repository.getBySlug("auburn-university");

  assert.equal(byId?.name, "Auburn University");
  assert.equal(byId?.programCount, 4);
  assert.equal("internalFieldThatMustNotLeak" in (byId ?? {}), false);
  assert.equal(bySlug?.slug, "auburn-university");
  assert.deepEqual(calls[0].args.where, {
    id: "university-1",
    publicationStatus: "PUBLISHED",
  });
  assert.deepEqual(calls[1].args.where, {
    slug: "auburn-university",
    publicationStatus: "PUBLISHED",
  });
  assert.deepEqual(
    (calls[0].args.include as {
      _count: { select: { programs: { where: unknown } } };
    })._count.select.programs.where,
    {
      publicationStatus: "PUBLISHED",
      active: true,
    },
  );
});

test("public programCount uses only published active programs", async () => {
  const draftOnly = repositoryMock([
    universityRecord({ _count: { programs: 0 } }),
  ]);
  const publishedActive = repositoryMock([
    universityRecord({ _count: { programs: 2 } }),
  ]);

  const draftResult = await draftOnly.repository.list();
  const publishedResult = await publishedActive.repository.list();

  assert.equal(draftResult.items[0].programCount, 0);
  assert.equal(publishedResult.items[0].programCount, 2);
  const include = draftOnly.calls.find(
    (call) => call.operation === "findMany",
  )?.args.include;
  assert.deepEqual(include, {
    _count: {
      select: {
        programs: {
          where: {
            publicationStatus: "PUBLISHED",
            active: true,
          },
        },
      },
    },
  });
});

test("detail reads permit an explicit non-public publication status", async () => {
  const { repository, calls } = repositoryMock([
    universityRecord({ publicationStatus: "DRAFT" }),
  ]);
  await repository.getBySlug("auburn-university", {
    publicationStatus: "DRAFT",
  });
  assert.deepEqual(calls[0].args.where, {
    slug: "auburn-university",
    publicationStatus: "DRAFT",
  });
});

test("list paginates and applies normalized location and workflow filters", async () => {
  const { repository, calls } = repositoryMock([universityRecord()], 41);
  const result = await repository.list({
    country: " USA ",
    state: " Alabama ",
    city: " Auburn ",
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    verifiedOnly: true,
    page: 2,
    pageSize: 500,
  });

  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    publicationStatus: "PUBLISHED",
    country: { equals: "USA" },
    state: { equals: "Alabama" },
    city: { equals: "Auburn" },
    verificationStatus: {
      equals: "OFFICIAL_VERIFIED",
      in: ["OFFICIAL_VERIFIED", "MANUALLY_VERIFIED"],
    },
  });
  assert.equal(findMany.args.skip, 100);
  assert.equal(findMany.args.take, 100);
  assert.deepEqual(result.pagination, {
    page: 2,
    pageSize: 100,
    totalItems: 41,
    totalPages: 1,
  });
});

test("verifiedOnly does not silently overwrite a conflicting explicit status", async () => {
  const { repository, calls } = repositoryMock([]);
  await repository.list({
    verificationStatus: "PARTNER_MATCHED",
    verifiedOnly: true,
  });
  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    publicationStatus: "PUBLISHED",
    verificationStatus: {
      equals: "PARTNER_MATCHED",
      in: ["OFFICIAL_VERIFIED", "MANUALLY_VERIFIED"],
    },
  });
});

test("search trims text and searches university identity, location, and aliases", async () => {
  const { repository, calls } = repositoryMock();
  await repository.search({
    query: " Auburn ",
    country: "USA",
    page: 1,
    pageSize: 10,
  });
  const findMany = calls.find((call) => call.operation === "findMany")!;
  assert.deepEqual(findMany.args.where, {
    AND: [
      {
        publicationStatus: "PUBLISHED",
        country: { equals: "USA" },
      },
      {
        OR: [
          { name: { contains: "Auburn" } },
          { city: { contains: "Auburn" } },
          { state: { contains: "Auburn" } },
          { country: { contains: "Auburn" } },
          { aliases: { some: { name: { contains: "Auburn" } } } },
        ],
      },
    ],
  });
  assert.equal(findMany.args.skip, 0);
  assert.equal(findMany.args.take, 10);
});
