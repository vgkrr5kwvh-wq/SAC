import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { handleUniversityDetailRequest } from "../app/api/universities/[slug]/route";
import UniversityDetailView from "../app/universities/[slug]/_components/university-detail";
import { buildUniversityMetadata } from "../app/universities/[slug]/page";
import type { UniversityDetailApiResponse } from "../lib/university-intelligence/api/university-detail.client";
import { safePublicUrl } from "../lib/university-intelligence/safe-public-url";

const detail: UniversityDetailApiResponse = {
  university: {
    id: "university-1",
    name: "Auburn University",
    slug: "auburn-university",
    country: "USA",
    state: "Alabama",
    city: "Auburn",
    address: "Auburn, Alabama",
    institutionType: "Public university",
    foundedYear: 1856,
    description: "A public research university.",
    officialWebsiteUrl: "https://www.auburn.edu/",
    logoUrl: null,
    bannerImageUrl: null,
    publicationStatus: "PUBLISHED",
    verificationStatus: "OFFICIAL_VERIFIED",
    programCount: 7,
    links: [{
      id: "link-1",
      type: "admissions",
      label: "Admissions",
      url: "https://www.auburn.edu/admissions/",
    }, {
      id: "link-2",
      type: "program-directory-undergraduate",
      label: "Undergraduate Majors",
      url: "https://bulletin.auburn.edu/undergraduate/majors/",
    }, {
      id: "link-3",
      type: "program-directory-graduate",
      label: "Graduate Programs",
      url: "https://bulletin.auburn.edu/thegraduateschool/graduatedegreesoffered/",
    }, {
      id: "link-4",
      type: "source-listing",
      label: "University Study destinations",
      url: "https://universitystudy.com/study-destinations/",
    }],
    admissionRequirements: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  programs: {
    items: [{
      id: "program-1",
      universityId: "university-1",
      name: "Accounting",
      slug: "accounting",
      degreeLevel: "Bachelor",
      studyLevel: "undergraduate",
      programType: "major",
      subjectArea: "Business",
      campus: "Auburn",
      durationText: "4 years",
      isStem: false,
      active: true,
      publicationStatus: "PUBLISHED",
      verificationStatus: "OFFICIAL_VERIFIED",
      university: {
        id: "university-1",
        name: "Auburn University",
        slug: "auburn-university",
        country: "USA",
        state: "Alabama",
        city: "Auburn",
        logoUrl: null,
      },
      startingTuition: 35000,
      tuitionCurrency: "USD",
      scholarshipAvailable: true,
      intakeTerms: ["Fall"],
    }],
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: 1,
      totalPages: 1,
    },
  },
  scholarships: {
    items: [{
      id: "scholarship-1",
      universityId: "university-1",
      programId: null,
      scope: "university-wide",
      name: "Merit Scholarship",
      availability: "AVAILABLE",
      scholarshipType: "merit",
      studyLevel: "undergraduate",
      minimumAmount: 5000,
      maximumAmount: 10000,
      amountText: "$5,000–$10,000",
      currency: "USD",
      deadlineText: "December 1",
      deadline: null,
      publicationStatus: "PUBLISHED",
      verificationStatus: "OFFICIAL_VERIFIED",
      university: {
        id: "university-1",
        name: "Auburn University",
        slug: "auburn-university",
        country: "USA",
      },
      program: null,
      eligibilitySummary: "Strong academic record.",
      scholarshipUrl: "https://www.auburn.edu/scholarships/",
    }, {
      id: "scholarship-2",
      universityId: "university-1",
      programId: "program-1",
      scope: "program-specific",
      name: "Accounting Award",
      availability: "AVAILABLE",
      scholarshipType: "departmental",
      studyLevel: "undergraduate",
      minimumAmount: null,
      maximumAmount: null,
      amountText: null,
      currency: null,
      deadlineText: null,
      deadline: null,
      publicationStatus: "PUBLISHED",
      verificationStatus: "OFFICIAL_VERIFIED",
      university: {
        id: "university-1",
        name: "Auburn University",
        slug: "auburn-university",
        country: "USA",
      },
      program: {
        id: "program-1",
        name: "Accounting",
        slug: "accounting",
        degreeLevel: "Bachelor",
      },
      eligibilitySummary: null,
      scholarshipUrl: null,
    }],
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: 2,
      totalPages: 1,
    },
  },
};

function repositories(university: unknown = detail.university) {
  return {
    universities: { getBySlug: async () => university },
    programs: { listByUniversity: async () => detail.programs },
    scholarships: { listByUniversity: async () => detail.scholarships },
  };
}

test("published university API composes public detail, programs, and scholarships", async () => {
  const response = await handleUniversityDetailRequest(
    "auburn-university",
    repositories() as never,
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.university.name, "Auburn University");
  assert.equal(body.programs.items.length, 1);
  assert.equal(body.scholarships.items.length, 2);
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, stale-while-revalidate=300");
});

test("missing or unpublished university returns 404 before related reads", async () => {
  let relatedReads = 0;
  const response = await handleUniversityDetailRequest(
    "draft-university",
    {
      universities: { getBySlug: async () => null },
      programs: {
        listByUniversity: async () => {
          relatedReads += 1;
          return detail.programs;
        },
      },
      scholarships: {
        listByUniversity: async () => {
          relatedReads += 1;
          return detail.scholarships;
        },
      },
    } as never,
  );

  assert.equal(response.status, 404);
  assert.equal(relatedReads, 0);
});

test("detail view renders programs and distinguishable scholarship scopes", () => {
  const html = renderToStaticMarkup(
    React.createElement(UniversityDetailView, { data: detail }),
  );

  assert.match(html, /Auburn University/);
  assert.match(html, /Accounting/);
  assert.match(html, /\$35,000/);
  assert.match(html, /Fall/);
  assert.match(html, /University-wide/);
  assert.match(html, /Program-specific · Accounting/);
  assert.match(html, /Strong academic record/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("missing optional fields render graceful public empty states", () => {
  const missing: UniversityDetailApiResponse = {
    university: {
      ...detail.university,
      city: null,
      state: null,
      country: null,
      address: null,
      description: null,
      institutionType: null,
      foundedYear: null,
      officialWebsiteUrl: null,
      logoUrl: null,
      bannerImageUrl: null,
      links: [],
      admissionRequirements: [],
    },
    programs: {
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    },
    scholarships: {
      items: [],
      pagination: { page: 1, pageSize: 100, totalItems: 0, totalPages: 0 },
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(UniversityDetailView, { data: missing }),
  );

  assert.match(html, /Location not provided/);
  assert.match(html, /description is not available/i);
  assert.match(html, /No published programs yet/i);
  assert.match(html, /No published scholarships yet/i);
  assert.match(html, /Admission requirements are not available/i);
  assert.match(html, /No official links available/i);
});

test("official links allow HTTPS only", () => {
  assert.equal(
    safePublicUrl("https://www.auburn.edu/admissions"),
    "https://www.auburn.edu/admissions",
  );
  assert.equal(safePublicUrl("http://example.test"), null);
  assert.equal(safePublicUrl("javascript:alert(1)"), null);

  const unsafe: UniversityDetailApiResponse = {
    ...detail,
    university: {
      ...detail.university,
      officialWebsiteUrl: "javascript:alert(1)",
      links: [{
        id: "unsafe",
        type: "application",
        label: "Unsafe application",
        url: "http://example.test/apply",
      }],
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(UniversityDetailView, { data: unsafe }),
  );
  assert.doesNotMatch(html, /Unsafe application|javascript:|example\.test/);
});

test("public link groups render labels without internal classifiers", () => {
  const html = renderToStaticMarkup(
    React.createElement(UniversityDetailView, { data: detail }),
  );

  assert.match(html, /Official university resources/);
  assert.match(html, /Program directories/);
  assert.match(html, /Partner and source references/);
  assert.match(html, /Undergraduate Majors/);
  assert.match(html, /Graduate Programs/);
  assert.match(html, /University Study destinations/);
  assert.doesNotMatch(html, /program-directory-graduate/);
  assert.doesNotMatch(html, /program-directory-undergraduate/);
  assert.doesNotMatch(html, /source-listing/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("metadata uses the real university identity and canonical slug", () => {
  const metadata = buildUniversityMetadata(detail.university);
  assert.equal(metadata.title, "Auburn University");
  assert.equal(
    metadata.alternates?.canonical,
    "/universities/auburn-university",
  );
  assert.equal(metadata.description, "A public research university.");
});

test("API failures return a safe 500 without internal details", async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await handleUniversityDetailRequest(
      "auburn-university",
      {
        universities: {
          getBySlug: async () => {
            throw new Error("database credentials and stack");
          },
        },
        programs: { listByUniversity: async () => detail.programs },
        scholarships: {
          listByUniversity: async () => detail.scholarships,
        },
      } as never,
    );
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.equal(JSON.stringify(body).includes("database"), false);
  } finally {
    console.error = originalError;
  }
});
