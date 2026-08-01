import { UniversityPublicationStatus, VerificationStatus, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdmissionRequirementManagementResult } from "../dto/admission-requirement.dto";
import { admissionRequirementManagementSelect, mapAdmissionRequirementToManagementSummary } from "../mappers/admission-requirement.mapper";
import type { AdmissionRequirementManagementFilters } from "../types/admission-requirement";

const MAX_PAGE_SIZE = 100;
type Client = Pick<PrismaClient, "admissionRequirement" | "program">;

function normalized(value: string | undefined) {
  return value?.trim() || undefined;
}

function publicationWhere(status: UniversityPublicationStatus | undefined): Prisma.AdmissionRequirementWhereInput {
  if (!status) return {};
  return { OR: [
    { programId: null, university: { publicationStatus: status } },
    { program: { publicationStatus: status } },
  ] };
}

function buildWhere(universityId: string, filters: AdmissionRequirementManagementFilters): Prisma.AdmissionRequirementWhereInput {
  const query = normalized(filters.query);
  const studyLevel = normalized(filters.studyLevel);
  const degreeLevel = normalized(filters.degreeLevel);
  const programId = normalized(filters.programId);
  const base: Prisma.AdmissionRequirementWhereInput = {
    universityId,
    ...(studyLevel ? { studyLevel: { equals: studyLevel } } : {}),
    ...(degreeLevel ? { program: { degreeLevel: { equals: degreeLevel } } } : {}),
    ...(programId ? { programId } : {}),
    ...(filters.verificationStatus ? { verificationStatus: filters.verificationStatus } : {}),
    ...(filters.scope === "university-wide" ? { programId: null } : {}),
    ...(filters.scope === "program-specific" ? { programId: { not: null } } : {}),
  };
  const clauses: Prisma.AdmissionRequirementWhereInput[] = [base, publicationWhere(filters.publicationStatus)];
  if (query) clauses.push({ OR: [
    { studyLevel: { contains: query } },
    { entryRoute: { contains: query } },
    { academicRequirementText: { contains: query } },
    { prerequisiteSubjects: { contains: query } },
    { program: { name: { contains: query } } },
  ] });
  return { AND: clauses };
}

export class AdmissionRequirementRepository {
  constructor(private readonly client: Client = prisma) {}

  async listForManagement(universityId: string, filters: AdmissionRequirementManagementFilters = {}): Promise<AdmissionRequirementManagementResult> {
    const where = buildWhere(universityId, filters);
    const all = { universityId } satisfies Prisma.AdmissionRequirementWhereInput;
    const published = { AND: [all, publicationWhere(UniversityPublicationStatus.PUBLISHED)] } satisfies Prisma.AdmissionRequirementWhereInput;
    const draft = { AND: [all, publicationWhere(UniversityPublicationStatus.DRAFT)] } satisfies Prisma.AdmissionRequirementWhereInput;
    const [requirements, total, publishedCount, draftCount, officiallyVerified, universityWide, programSpecific, studyRows, programs] = await Promise.all([
      this.client.admissionRequirement.findMany({ where, select: admissionRequirementManagementSelect, orderBy: [{ studyLevel: "asc" }, { programId: "asc" }, { id: "asc" }], take: MAX_PAGE_SIZE }),
      this.client.admissionRequirement.count({ where: all }),
      this.client.admissionRequirement.count({ where: published }),
      this.client.admissionRequirement.count({ where: draft }),
      this.client.admissionRequirement.count({ where: { universityId, verificationStatus: VerificationStatus.OFFICIAL_VERIFIED } }),
      this.client.admissionRequirement.count({ where: { universityId, programId: null } }),
      this.client.admissionRequirement.count({ where: { universityId, programId: { not: null } } }),
      this.client.admissionRequirement.findMany({ where: { universityId, studyLevel: { not: null } }, select: { studyLevel: true }, distinct: ["studyLevel"], orderBy: { studyLevel: "asc" } }),
      this.client.program.findMany({ where: { universityId, admissionRequirements: { some: {} } }, select: { id: true, name: true, degreeLevel: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    ]);
    return {
      requirements: requirements.map(mapAdmissionRequirementToManagementSummary),
      statistics: { total, published: publishedCount, draft: draftCount, officiallyVerified, universityWide, programSpecific },
      options: {
        studyLevels: studyRows.flatMap(({ studyLevel }) => studyLevel ? [studyLevel] : []),
        degreeLevels: [...new Set(programs.flatMap(({ degreeLevel }) => degreeLevel ? [degreeLevel] : []))].sort(),
        programs: programs.map(({ id, name }) => ({ id, name })),
      },
    };
  }
}
