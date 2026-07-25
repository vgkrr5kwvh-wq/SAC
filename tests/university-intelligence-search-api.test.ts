import assert from "node:assert/strict";
import test from "node:test";
import { handleSearchRequest } from "../app/api/search/route";

function result(totalItems = 1) {
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

function serviceMock() {
  const calls: Array<{
    method: string;
    filters: Record<string, unknown>;
  }> = [];
  const service = {
    searchEverything: async (filters: Record<string, unknown>) => {
      calls.push({ method: "searchEverything", filters });
      return {
        universities: result(),
        programs: result(),
        scholarships: result(),
        totalResults: 3,
        query: filters.query,
        executionTimeMs: 1,
      };
    },
    searchUniversities: async (filters: Record<string, unknown>) => {
      calls.push({ method: "searchUniversities", filters });
      return result();
    },
    searchPrograms: async (filters: Record<string, unknown>) => {
      calls.push({ method: "searchPrograms", filters });
      return result();
    },
    searchScholarships: async (filters: Record<string, unknown>) => {
      calls.push({ method: "searchScholarships", filters });
      return result();
    },
  };
  return { service, calls };
}

function request(query = "") {
  return new Request(`http://localhost/api/search${query}`);
}

test("defaults to all and trims the query", async () => {
  const { service, calls } = serviceMock();
  const response = await handleSearchRequest(
    request("?q=%20Auburn%20"),
    service as never,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, stale-while-revalidate=300");
  assert.equal(calls[0].method, "searchEverything");
  assert.equal(calls[0].filters.query, "Auburn");
  assert.equal(body.query, "Auburn");
  assert.equal(body.totalResults, 3);
});

for (const [type, method] of [
  ["universities", "searchUniversities"],
  ["programs", "searchPrograms"],
  ["scholarships", "searchScholarships"],
] as const) {
  test(`dispatches ${type} searches to ${method}`, async () => {
    const { service, calls } = serviceMock();
    const response = await handleSearchRequest(
      request(`?type=${type}&q=test`),
      service as never,
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, method);
    assert.equal(body.type, type);
    assert.equal(body.query, "test");
    assert.deepEqual(body.result, result());
  });
}

test("rejects an unsupported type", async () => {
  const { service, calls } = serviceMock();
  const response = await handleSearchRequest(
    request("?type=degrees"),
    service as never,
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_QUERY");
  assert.equal(body.error.parameter, "type");
  assert.equal(calls.length, 0);
});

for (const [parameter, value] of [
  ["page", "0"],
  ["pageSize", "1.5"],
  ["verifiedOnly", "yes"],
  ["tuitionMin", "-1"],
] as const) {
  test(`rejects malformed ${parameter}`, async () => {
    const { service, calls } = serviceMock();
    const response = await handleSearchRequest(
      request(`?${parameter}=${encodeURIComponent(value)}`),
      service as never,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_QUERY");
    assert.equal(body.error.parameter, parameter);
    assert.equal(calls.length, 0);
  });
}

test("caps pageSize and parses filters before dispatch", async () => {
  const { service, calls } = serviceMock();
  const response = await handleSearchRequest(
    request(
      "?type=programs&page=2&pageSize=500"
      + "&scholarshipAvailable=true&tuitionMin=10000"
      + "&country=%20USA%20&sortBy=degreeLevel&sortDirection=desc",
    ),
    service as never,
  );

  assert.equal(response.status, 200);
  assert.equal(calls[0].filters.page, 2);
  assert.equal(calls[0].filters.pageSize, 100);
  assert.equal(calls[0].filters.scholarshipAvailable, true);
  assert.equal(calls[0].filters.tuitionMin, 10000);
  assert.equal(calls[0].filters.country, "USA");
  assert.equal(calls[0].filters.sortBy, "degreeLevel");
  assert.equal(calls[0].filters.sortDirection, "desc");
});

test("returns a safe 500 response when the service fails", async () => {
  const service = serviceMock().service;
  service.searchEverything = async () => {
    throw new Error("database connection string and stack details");
  };
  const originalError = console.error;
  const logged: unknown[] = [];
  console.error = (...values: unknown[]) => {
    logged.push(...values);
  };
  try {
    const response = await handleSearchRequest(request(), service as never);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_ERROR",
        message: "The search request could not be completed.",
      },
    });
    assert.equal(JSON.stringify(body).includes("database"), false);
    assert.deepEqual(logged, [
      "University Intelligence search request failed.",
    ]);
  } finally {
    console.error = originalError;
  }
});
