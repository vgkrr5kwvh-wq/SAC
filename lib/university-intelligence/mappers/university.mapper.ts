import type { Prisma } from "@prisma/client";

import type {
  UniversityDetail,
  UniversitySummary,
} from "../dto/university.dto";

export const universitySummaryInclude = {
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
} satisfies Prisma.UniversityInclude;

export const universityDetailInclude = {
  ...universitySummaryInclude,
  links: {
    select: {
      id: true,
      type: true,
      label: true,
      url: true,
    },
    orderBy: [
      { type: "asc" },
      { id: "asc" },
    ],
  },
  admissionRequirements: {
    where: {
      verificationStatus: {
        in: ["OFFICIAL_VERIFIED", "MANUALLY_VERIFIED"],
      },
    },
    select: {
      id: true,
      programId: true,
      studyLevel: true,
      entryRoute: true,
      minimumGpa: true,
      academicRequirementText: true,
      ieltsOverall: true,
      toeflOverall: true,
      pteOverall: true,
      duolingoOverall: true,
      greRequired: true,
      gmatRequired: true,
      satRequired: true,
      actRequired: true,
      applicationFee: true,
      currency: true,
      requirementUrl: true,
      applicationUrl: true,
      program: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [
      { studyLevel: "asc" },
      { id: "asc" },
    ],
  },
} satisfies Prisma.UniversityInclude;

type UniversityWithProgramCount = Prisma.UniversityGetPayload<{
  include: typeof universitySummaryInclude;
}>;

type UniversityDetailPayload = Prisma.UniversityGetPayload<{
  include: typeof universityDetailInclude;
}>;

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

export function mapUniversityToSummary(
  university: UniversityWithProgramCount,
): UniversitySummary {
  return {
    id: university.id,
    name: university.name,
    slug: university.slug,
    country: university.country,
    state: university.state,
    city: university.city,
    institutionType: university.institutionType,
    foundedYear: university.foundedYear,
    officialWebsiteUrl: university.officialWebsiteUrl,
    logoUrl: university.logoUrl,
    publicationStatus: university.publicationStatus,
    verificationStatus: university.verificationStatus,
    programCount: university._count.programs,
  };
}

export function mapUniversityToDetail(
  university: UniversityDetailPayload,
): UniversityDetail {
  return {
    ...mapUniversityToSummary(university),
    address: university.address,
    description: university.description,
    bannerImageUrl: university.bannerImageUrl,
    links: university.links,
    admissionRequirements: university.admissionRequirements.map(
      (requirement) => ({
        ...requirement,
        minimumGpa: decimalToNumber(requirement.minimumGpa),
        ieltsOverall: decimalToNumber(requirement.ieltsOverall),
        toeflOverall: decimalToNumber(requirement.toeflOverall),
        pteOverall: decimalToNumber(requirement.pteOverall),
        duolingoOverall: decimalToNumber(requirement.duolingoOverall),
        applicationFee: decimalToNumber(requirement.applicationFee),
      }),
    ),
    createdAt: university.createdAt,
    updatedAt: university.updatedAt,
  };
}
