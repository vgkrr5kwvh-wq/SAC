import type { Prisma } from "@prisma/client";

import type {
  UniversityDetail,
  UniversitySummary,
} from "../dto/university.dto";

type UniversityWithProgramCount = Prisma.UniversityGetPayload<{
  include: {
    _count: {
      select: {
        programs: true;
      };
    };
  };
}>;

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
  university: UniversityWithProgramCount,
): UniversityDetail {
  return {
    ...mapUniversityToSummary(university),
    address: university.address,
    description: university.description,
    bannerImageUrl: university.bannerImageUrl,
    createdAt: university.createdAt,
    updatedAt: university.updatedAt,
  };
}
