import assert from "node:assert/strict";
import test from "node:test";
import { UniversitySearchService } from "../lib/university-intelligence";

function paginated(totalItems: number) {
  return {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems,
      totalPages: totalItems ? 1 : 0,
    },
  };
}

function serviceMock(totals = {
  universities: 2,
  programs: 3,
  scholarships: 4,
}) {
  const calls: Array<{
    repository: string;
    filters: Record<string, unknown>;
  }> = [];
  const universityRepository = {
    search: async (filters: Record<string, unknown>) => {
      calls.push({ repository: "universities", filters });
      return paginated(totals.universities);
    },
  };
  const programRepository = {
    search: async (filters: Record<string, unknown>) => {
      calls.push({ repository: "programs", filters });
      return paginated(totals.programs);
    },
  };
  const scholarshipRepository = {
    search: async (filters: Record<string, unknown>) => {
      calls.push({ repository: "scholarships", filters });
      return paginated(totals.scholarships);
    },
  };

  return {
    service: new UniversitySearchService(
      universityRepository as never,
      programRepository as never,
      scholarshipRepository as never,
    ),
    calls,
  };
}

test("individual searches trim queries and remove blank string filters", async () => {
  const { service, calls } = serviceMock();

  await service.searchUniversities({
    query: " Auburn ",
    country: " USA ",
    state: " ",
  });
  await service.searchPrograms({
    query: " Engineering ",
    universityId: " ",
    degreeLevel: " Bachelor ",
  });
  await service.searchScholarships({
    query: " Merit ",
    programId: "",
    scholarshipType: " merit ",
  });

  assert.deepEqual(calls[0], {
    repository: "universities",
    filters: {
      query: "Auburn",
      country: "USA",
    },
  });
  assert.deepEqual(calls[1], {
    repository: "programs",
    filters: {
      query: "Engineering",
      degreeLevel: "Bachelor",
    },
  });
  assert.deepEqual(calls[2], {
    repository: "scholarships",
    filters: {
      query: "Merit",
      scholarshipType: "merit",
    },
  });
});

test("searchEverything delegates once per repository and totals all matches", async () => {
  const { service, calls } = serviceMock();
  const result = await service.searchEverything({
    query: " Auburn ",
    country: " USA ",
    page: 2,
    pageSize: 10,
    degreeLevel: " Bachelor ",
    scholarshipType: " merit ",
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((call) => call.repository).sort(),
    ["programs", "scholarships", "universities"],
  );
  assert.equal(result.query, "Auburn");
  assert.equal(result.totalResults, 9);
  assert.ok(result.executionTimeMs >= 0);
  assert.equal(result.universities.pagination.totalItems, 2);
  assert.equal(result.programs.pagination.totalItems, 3);
  assert.equal(result.scholarships.pagination.totalItems, 4);

  const programCall = calls.find((call) =>
    call.repository === "programs"
  )!;
  const scholarshipCall = calls.find((call) =>
    call.repository === "scholarships"
  )!;
  assert.equal(programCall.filters.degreeLevel, "Bachelor");
  assert.equal(scholarshipCall.filters.scholarshipType, "merit");
});

test("searchEverything runs independent repository searches concurrently", async () => {
  const started: string[] = [];
  const releases: Array<() => void> = [];
  function deferredSearch(name: string) {
    return async () => {
      started.push(name);
      await new Promise<void>((resolve) => releases.push(resolve));
      return paginated(1);
    };
  }
  const service = new UniversitySearchService(
    { search: deferredSearch("universities") } as never,
    { search: deferredSearch("programs") } as never,
    { search: deferredSearch("scholarships") } as never,
  );

  const pending = service.searchEverything({ query: "test" });
  await Promise.resolve();
  assert.deepEqual(started, ["universities", "programs", "scholarships"]);
  releases.forEach((release) => release());

  const result = await pending;
  assert.equal(result.totalResults, 3);
});

test("the service uses only injected repository methods", async () => {
  const { service, calls } = serviceMock();
  await service.searchEverything({ query: "" });

  assert.equal(calls.length, 3);
  assert.deepEqual(
    calls.map((call) => call.repository).sort(),
    ["programs", "scholarships", "universities"],
  );
});
