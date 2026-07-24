import { z } from "zod";
import { prisma } from "../lib/prisma";
import { safeErrorMessage, safeImportLog } from "../src/lib/university-import/logging";

const optionsSchema = z.object({
  universityId: z.string().cuid(),
});

function parseOptions(args: readonly string[]) {
  const input: Record<string, string | undefined> = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--university-id") input.universityId = args[++index];
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return optionsSchema.parse(input);
}

async function main() {
  const { universityId } = parseOptions(process.argv.slice(2));
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    select: { id: true, name: true, slug: true, publicationStatus: true, verificationStatus: true },
  });
  if (!university) throw new Error("University was not found.");

  const [programs, claimCount, conflictCount, records, jobs] = await Promise.all([
    prisma.program.findMany({
      where: { universityId },
      select: {
        id: true,
        name: true,
        slug: true,
        studyLevel: true,
        programType: true,
        publicationStatus: true,
        verificationStatus: true,
        sourceName: true,
        sourceUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    }),
    prisma.universityFieldClaim.count({ where: { universityId } }),
    prisma.universityFieldClaim.count({
      where: { universityId, conflictStatus: { not: "NONE" } },
    }),
    prisma.importRecord.findMany({
      where: { universityId },
      select: {
        id: true,
        importJobId: true,
        entityType: true,
        entityName: true,
        status: true,
        sourceUrl: true,
        errorMessage: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.importJob.findMany({
      where: { records: { some: { universityId } } },
      select: {
        id: true,
        sourceName: true,
        mode: true,
        status: true,
        discoveredCount: true,
        importedCount: true,
        updatedCount: true,
        skippedCount: true,
        failedCount: true,
        errorSummary: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  console.log(JSON.stringify({
    event: "university-enrichment-read-only-audit",
    university,
    counts: {
      programs: programs.length,
      claims: claimCount,
      conflicts: conflictCount,
      importRecords: records.length,
      importJobs: jobs.length,
    },
    programs,
    importRecords: records,
    importJobs: jobs,
  }, null, 2));
}

main()
  .catch((error) => {
    safeImportLog("university-enrichment-audit-failed", {
      error: safeErrorMessage(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
