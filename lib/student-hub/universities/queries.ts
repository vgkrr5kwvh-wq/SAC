import { sampleUniversities } from "./data";
import type { University, UniversityCountryCode } from "./types";

// TODO: Keep this query surface stable when the sample dataset migrates to the
// CMS. A future repository adapter can provide validated CMS records without
// coupling finder logic or React components to the storage implementation.
export function getAllUniversities(): readonly University[] {
  return sampleUniversities;
}

export function getUniversityBySlug(slug: string): University | undefined {
  return sampleUniversities.find((university) => university.slug === slug);
}

export function getUniversitiesByCountry(country: UniversityCountryCode): readonly University[] {
  return sampleUniversities.filter((university) => university.country === country);
}

export function getFeaturedUniversities(): readonly University[] {
  return sampleUniversities.filter((university) => university.featured && university.active);
}
