import { UniversityPublicationStatus, VerificationStatus, type Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TuitionManagementResult } from "../dto/tuition.dto";
import { mapTuitionToManagementSummary, tuitionManagementSelect } from "../mappers/tuition.mapper";
import type { TuitionManagementFilters } from "../types/tuition";
type Client = Pick<PrismaClient, "tuition" | "program">;
const LIMIT = 100;
const clean = (value: string | undefined) => value?.trim() || undefined;
function publication(status: UniversityPublicationStatus | undefined): Prisma.TuitionWhereInput { return status ? { OR: [{ programId: null, university: { publicationStatus: status } }, { program: { publicationStatus: status } }] } : {}; }
function where(universityId: string, filters: TuitionManagementFilters): Prisma.TuitionWhereInput {
  const query = clean(filters.query); const studyLevel = clean(filters.studyLevel); const degreeLevel = clean(filters.degreeLevel); const programId = clean(filters.programId); const currency = clean(filters.currency); const period = clean(filters.period); const academicYear = clean(filters.academicYear);
  const clauses: Prisma.TuitionWhereInput[] = [{ universityId, ...(studyLevel ? { studyLevel: { equals: studyLevel } } : {}), ...(degreeLevel ? { program: { degreeLevel: { equals: degreeLevel } } } : {}), ...(programId ? { programId } : {}), ...(currency ? { currency: { equals: currency } } : {}), ...(period ? { period: { equals: period } } : {}), ...(academicYear ? { academicYear: { equals: academicYear } } : {}), ...(filters.verificationStatus ? { verificationStatus: filters.verificationStatus } : {}), ...(filters.scope === "university-wide" ? { programId: null } : {}), ...(filters.scope === "program-specific" ? { programId: { not: null } } : {}) }, publication(filters.publicationStatus)];
  if (query) clauses.push({ OR: [{ studyLevel: { contains: query } }, { period: { contains: query } }, { academicYear: { contains: query } }, { currency: { contains: query } }, { program: { name: { contains: query } } }] });
  return { AND: clauses };
}
export class TuitionRepository {
  constructor(private readonly client: Client = prisma) {}
  async listForManagement(universityId: string, filters: TuitionManagementFilters = {}): Promise<TuitionManagementResult> {
    const all = { universityId } satisfies Prisma.TuitionWhereInput;
    const undergraduate = { universityId, OR: [{ studyLevel: { contains: "undergraduate" } }, { program: { degreeLevel: { contains: "bachelor" } } }] } satisfies Prisma.TuitionWhereInput;
    const graduate = { universityId, OR: [{ studyLevel: { contains: "graduate" } }, { program: { degreeLevel: { contains: "master" } } }, { program: { degreeLevel: { contains: "doctoral" } } }, { program: { degreeLevel: { contains: "phd" } } }] } satisfies Prisma.TuitionWhereInput;
    const [rows,total,published,draft,officiallyVerified,universityWide,programSpecific,undergraduateCount,graduateCount,studyRows,currencyRows,periodRows,yearRows,programs] = await Promise.all([
      this.client.tuition.findMany({ where: where(universityId, filters), select: tuitionManagementSelect, orderBy: [{ academicYear: "desc" }, { programId: "asc" }, { id: "asc" }], take: LIMIT }),
      this.client.tuition.count({ where: all }), this.client.tuition.count({ where: { AND: [all, publication(UniversityPublicationStatus.PUBLISHED)] } }), this.client.tuition.count({ where: { AND: [all, publication(UniversityPublicationStatus.DRAFT)] } }), this.client.tuition.count({ where: { universityId, verificationStatus: VerificationStatus.OFFICIAL_VERIFIED } }), this.client.tuition.count({ where: { universityId, programId: null } }), this.client.tuition.count({ where: { universityId, programId: { not: null } } }), this.client.tuition.count({ where: undergraduate }), this.client.tuition.count({ where: graduate }),
      this.client.tuition.findMany({ where: { universityId, studyLevel: { not: null } }, select: { studyLevel: true }, distinct: ["studyLevel"], orderBy: { studyLevel: "asc" } }), this.client.tuition.findMany({ where: { universityId, currency: { not: null } }, select: { currency: true }, distinct: ["currency"], orderBy: { currency: "asc" } }), this.client.tuition.findMany({ where: { universityId, period: { not: null } }, select: { period: true }, distinct: ["period"], orderBy: { period: "asc" } }), this.client.tuition.findMany({ where: { universityId, academicYear: { not: null } }, select: { academicYear: true }, distinct: ["academicYear"], orderBy: { academicYear: "desc" } }), this.client.program.findMany({ where: { universityId, tuitionRecords: { some: {} } }, select: { id: true, name: true, degreeLevel: true }, orderBy: [{ name: "asc" }, { id: "asc" }] })
    ]);
    return { tuition: rows.map(mapTuitionToManagementSummary), statistics: { total,published,draft,officiallyVerified,universityWide,programSpecific,undergraduate: undergraduateCount,graduate: graduateCount }, options: { studyLevels: studyRows.flatMap(({studyLevel}) => studyLevel ? [studyLevel] : []), degreeLevels: [...new Set(programs.flatMap(({degreeLevel}) => degreeLevel ? [degreeLevel] : []))].sort(), programs: programs.map(({id,name}) => ({id,name})), currencies: currencyRows.flatMap(({currency}) => currency ? [currency] : []), periods: periodRows.flatMap(({period}) => period ? [period] : []), academicYears: yearRows.flatMap(({academicYear}) => academicYear ? [academicYear] : []) } };
  }
}
