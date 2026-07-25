import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import UniversityExplorer from "../app/universities/_components/university-explorer";
import {
  buildUniversityExplorerUrl,
} from "../app/universities/_components/university-pagination";
import {
  fetchUniversitySearch,
  type UniversitySearchApiResponse,
} from "../lib/university-intelligence/api/university-search.client";

const response: UniversitySearchApiResponse = {
  type: "universities",
  query: "",
  result: {
    items: [{
      id: "university-1",
      name: "Auburn University",
      slug: "auburn-university",
      country: "USA",
      state: "Alabama",
      city: "Auburn",
      institutionType: "Public university",
      foundedYear: 1856,
      officialWebsiteUrl: "https://www.auburn.edu/",
      logoUrl: null,
      publicationStatus: "PUBLISHED",
      verificationStatus: "OFFICIAL_VERIFIED",
      programCount: 10,
    }],
    pagination: {
      page: 1,
      pageSize: 12,
      totalItems: 25,
      totalPages: 3,
    },
  },
};

test("renders the initial explorer, filters, card, and pagination", () => {
  const html = renderToStaticMarkup(React.createElement(
    UniversityExplorer,
    { filters: {}, response },
  ));

  assert.match(html, /Search universities/i);
  assert.match(html, /Country/i);
  assert.match(html, /Verification status/i);
  assert.match(html, /Auburn University/i);
  assert.match(html, /Auburn, Alabama, USA/i);
  assert.match(html, /10 programmes/i);
  assert.match(html, /Officially verified/i);
  assert.match(html, /href="\/universities\/auburn-university"/i);
  assert.match(html, /Official website/i);
  assert.match(html, /Page 1 of 3/i);
});

test("typed API client reflects query and filters in its request", async () => {
  let requestedUrl = "";
  const mockFetch = async (input: string | URL | Request) => {
    requestedUrl = input.toString();
    return Response.json(response);
  };

  await fetchUniversitySearch(
    "https://example.test",
    {
      query: " Auburn ",
      country: " USA ",
      verificationStatus: "OFFICIAL_VERIFIED",
      verifiedOnly: true,
      page: 2,
    },
    mockFetch,
  );

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, "/api/search");
  assert.equal(url.searchParams.get("type"), "universities");
  assert.equal(url.searchParams.get("q"), "Auburn");
  assert.equal(url.searchParams.get("country"), "USA");
  assert.equal(
    url.searchParams.get("verificationStatus"),
    "OFFICIAL_VERIFIED",
  );
  assert.equal(url.searchParams.get("verifiedOnly"), "true");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("pageSize"), "12");
});

test("pagination preserves active URL filters", () => {
  const url = buildUniversityExplorerUrl({
    query: "Auburn",
    country: "USA",
    verificationStatus: "OFFICIAL_VERIFIED",
    verifiedOnly: true,
  }, 3);
  const parsed = new URL(url, "https://example.test");

  assert.equal(parsed.pathname, "/universities");
  assert.equal(parsed.searchParams.get("q"), "Auburn");
  assert.equal(parsed.searchParams.get("country"), "USA");
  assert.equal(
    parsed.searchParams.get("verificationStatus"),
    "OFFICIAL_VERIFIED",
  );
  assert.equal(parsed.searchParams.get("verifiedOnly"), "true");
  assert.equal(parsed.searchParams.get("page"), "3");
});

test("renders an empty result without adding sample universities", () => {
  const emptyResponse: UniversitySearchApiResponse = {
    ...response,
    result: {
      items: [],
      pagination: {
        page: 1,
        pageSize: 12,
        totalItems: 0,
        totalPages: 0,
      },
    },
  };
  const html = renderToStaticMarkup(React.createElement(
    UniversityExplorer,
    { filters: { query: "missing" }, response: emptyResponse },
  ));

  assert.match(html, /No matching universities/i);
  assert.match(html, /Try broadening your search/i);
  assert.doesNotMatch(html, /Auburn University/i);
});

test("renders a safe API error state", () => {
  const html = renderToStaticMarkup(React.createElement(
    UniversityExplorer,
    { filters: {}, hasError: true },
  ));

  assert.match(html, /Search unavailable/i);
  assert.match(html, /could not load universities/i);
  assert.doesNotMatch(html, /database|stack|prisma/i);
});

test("cards handle missing optional fields without unsafe links", () => {
  const missingFields: UniversitySearchApiResponse = {
    ...response,
    result: {
      ...response.result,
      items: [{
        ...response.result.items[0],
        city: null,
        state: null,
        country: null,
        institutionType: null,
        officialWebsiteUrl: null,
        verificationStatus: "DISCOVERED",
        programCount: 0,
      }],
    },
  };
  const html = renderToStaticMarkup(React.createElement(
    UniversityExplorer,
    { filters: {}, response: missingFields },
  ));

  assert.match(html, /Location not provided/i);
  assert.match(html, /Institution type not provided/i);
  assert.match(html, /0 programmes/i);
  assert.doesNotMatch(html, /Official website/i);
});

test("typed API client safely rejects non-success responses", async () => {
  await assert.rejects(
    fetchUniversitySearch(
      "https://example.test",
      {},
      async () => Response.json({ internal: "hidden" }, { status: 500 }),
    ),
    /temporarily unavailable/i,
  );
});
