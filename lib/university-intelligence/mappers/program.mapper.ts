import type { Prisma } from "@prisma/client";

import type {
  ProgramCard,
  ProgramDetail,
  ProgramSearchResult,
  ProgramSummary,
} from "../dto/program.dto";

export const programSelect = {
  id: true,
  universityId: true,
  name: true,
  slug: true,
  degreeLevel: true,
  studyLevel: true,
  award: true,
  programType: true,
  department: true,
  subjectArea: true,
  deliveryMode: true,
  campus: true,
  durationText: true,
  creditsText: true,
  isStem: true,
  active: true,
  lastVerifiedAt: true,
  programUrl: true,
  sourceName: true,
  sourceUrl: true,
  publicationStatus: true,
  verificationStatus: true,
  createdAt: true,
  updatedAt: true,
  university: {
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      state: true,
      city: true,
      logoUrl: true,
    },
  },
  tuitionRecords: {
    select: {
      id: true,
      amount: true,
      currency: true,
      period: true,
      academicYear: true,
      estimatedCoa: true,
      sourceUrl: true,
    },
    orderBy: {
      amount: "asc",
    },
  },
  scholarships: {
    where: {
      publicationStatus: "PUBLISHED",
    },
    select: {
      id: true,
      name: true,
      scholarshipAvailable: true,
      amountText: true,
      currency: true,
      deadlineText: true,
      sourceUrl: true,
    },
  },
  intakes: {
    select: {
      id: true,
      term: true,
      month: true,
      year: true,
      deadline: true,
      sourceUrl: true,
    },
    orderBy: [
      { year: "asc" },
      { month: "asc" },
      { term: "asc" },
    ],
  },
} satisfies Prisma.ProgramSelect;

export type ProgramRepositoryPayload = Prisma.ProgramGetPayload<{
  select: typeof programSelect;
}>;

function decimalToNumber(
  value: Prisma.Decimal | null,
): number | null {
  return value === null ? null : value.toNumber();
}

export function mapProgramToSummary(
  program: ProgramRepositoryPayload,
): ProgramSummary {
  return {
    id: program.id,
    universityId: program.universityId,
    name: program.name,
    slug: program.slug,
    degreeLevel: program.degreeLevel,
    studyLevel: program.studyLevel,
    programType: program.programType,
    subjectArea: program.subjectArea,
    campus: program.campus,
    durationText: program.durationText,
    isStem: program.isStem,
    active: program.active,
    publicationStatus: program.publicationStatus,
    verificationStatus: program.verificationStatus,
    university: program.university,
  };
}

export function mapProgramToCard(
  program: ProgramRepositoryPayload,
): ProgramCard {
  const startingTuition = program.tuitionRecords.find(
    (tuition) => tuition.amount !== null,
  );
  return {
    ...mapProgramToSummary(program),
    startingTuition: decimalToNumber(startingTuition?.amount ?? null),
    tuitionCurrency: startingTuition?.currency ?? null,
    scholarshipAvailable: program.scholarships.some(
      (scholarship) => scholarship.scholarshipAvailable === "AVAILABLE",
    ),
    intakeTerms: [...new Set(program.intakes.map((intake) => intake.term))],
  };
}

export function mapProgramToDetail(
  program: ProgramRepositoryPayload,
): ProgramDetail {
  return {
    ...mapProgramToCard(program),
    award: program.award,
    department: program.department,
    deliveryMode: program.deliveryMode,
    creditsText: program.creditsText,
    lastVerifiedAt: program.lastVerifiedAt,
    programUrl: program.programUrl,
    sourceName: program.sourceName,
    sourceUrl: program.sourceUrl,
    tuition: program.tuitionRecords.map((tuition) => ({
      id: tuition.id,
      amount: decimalToNumber(tuition.amount),
      currency: tuition.currency,
      period: tuition.period,
      academicYear: tuition.academicYear,
      estimatedCoa: decimalToNumber(tuition.estimatedCoa),
      sourceUrl: tuition.sourceUrl,
    })),
    scholarships: program.scholarships.map((scholarship) => ({
      id: scholarship.id,
      name: scholarship.name,
      availability: scholarship.scholarshipAvailable,
      amountText: scholarship.amountText,
      currency: scholarship.currency,
      deadlineText: scholarship.deadlineText,
      sourceUrl: scholarship.sourceUrl,
    })),
    intakes: program.intakes.map((intake) => ({
      id: intake.id,
      term: intake.term,
      month: intake.month,
      year: intake.year,
      deadline: intake.deadline,
      sourceUrl: intake.sourceUrl,
    })),
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export function mapProgramToSearchResult(
  program: ProgramRepositoryPayload,
  matchedQuery: string,
): ProgramSearchResult {
  return {
    ...mapProgramToCard(program),
    matchedQuery,
  };
}
