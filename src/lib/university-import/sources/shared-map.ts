import type {
  NormalizedUniversityRecord,
  RawExtractedUniversity,
  UniversityImportSourceName,
} from "../types";
import {
  cleanText,
  mapScholarship,
  officialDomain,
  parseOptionalNumber,
  safeUrl,
  slugify,
} from "../normalizers";

export function mapRawUniversity(
  raw: RawExtractedUniversity,
  sourceName: UniversityImportSourceName,
): NormalizedUniversityRecord {
  const name = cleanText(raw.name);
  if (!name) throw new Error("The source record does not contain a university name.");
  const sourceUrl = safeUrl(raw.sourceUniversityUrl);
  if (!sourceUrl) throw new Error("The source university URL is invalid.");
  const officialWebsiteUrl = safeUrl(raw.officialWebsiteUrl, sourceUrl);
  return {
    sourceName,
    sourceUniversityUrl: sourceUrl,
    sourceExternalId: cleanText(raw.sourceExternalId),
    name,
    slug: slugify(name),
    country: cleanText(raw.country),
    state: cleanText(raw.state),
    city: cleanText(raw.city),
    address: cleanText(raw.address),
    institutionType: cleanText(raw.institutionType),
    foundedYear: parseOptionalNumber(raw.foundedYear),
    description: cleanText(raw.description),
    officialWebsiteUrl,
    officialDomain: officialDomain(officialWebsiteUrl),
    logoUrl: safeUrl(raw.logoUrl, sourceUrl),
    bannerImageUrl: safeUrl(raw.bannerImageUrl, sourceUrl),
    aliases: (raw.aliases ?? []).map(cleanText).filter((value): value is string => Boolean(value)),
    programs: (raw.programs ?? []).flatMap((program) => {
      const programName = cleanText(program.name);
      if (!programName) return [];
      return [{
        name: programName,
        slug: slugify(programName),
        degreeLevel: cleanText(program.degreeLevel),
        subjectArea: cleanText(program.subjectArea),
        durationText: cleanText(program.durationText),
        creditsText: cleanText(program.creditsText),
        isStem: program.isStem ?? null,
        programUrl: safeUrl(program.programUrl, sourceUrl),
        sourceUrl,
      }];
    }),
    admissionRequirements: raw.admissionRequirements ?? [],
    tuition: raw.tuition ?? [],
    scholarships: (raw.scholarships?.length ? raw.scholarships : [{}]).map((scholarship) =>
      mapScholarship(scholarship, sourceUrl)
    ),
    intakes: raw.intakes ?? [],
    links: (raw.links ?? []).flatMap((link) => {
      const url = safeUrl(link.url, sourceUrl);
      const type = cleanText(link.type);
      if (!url || !type) return [];
      return [{ type, label: cleanText(link.label), url, sourceUrl }];
    }),
  };
}
