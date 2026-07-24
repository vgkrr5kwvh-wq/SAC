import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma";
import {
  executeEnrichment,
  type EnrichmentDependencies,
} from "../src/lib/university-import/enrichment/runner";
import type { OfficialPageCandidate, OfficialPageSnapshot } from "../src/lib/university-import/enrichment/types";
import type { EnrichmentTarget } from "../src/lib/university-import/enrichment/types";
import {
  assertEnrichmentEnabled,
  parseEnrichmentCliOptions,
} from "../src/lib/university-import/enrichment/validation";
import { safeErrorMessage, safeImportLog } from "../src/lib/university-import/logging";
import { studiesOverseasUsaCatalogUrl } from "../src/lib/university-import/enrichment/match-sources";
import { writeDebugSnapshots } from "../src/lib/university-import/enrichment/debug";

async function fixtureDependencies(directory: string): Promise<EnrichmentDependencies> {
  const root = resolve(directory);
  const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as {
    studiesCatalog: string;
    studiesProfiles: Record<string, string>;
    homepage: string;
    pages: Record<string, string>;
    statuses?: Record<string, number>;
    redirects?: Record<string, string>;
  };
  const snapshot = async (candidate: OfficialPageCandidate): Promise<OfficialPageSnapshot> => ({
    ...candidate,
    finalUrl: manifest.redirects?.[candidate.url] ?? candidate.url,
    status: manifest.statuses?.[candidate.url] ?? 200,
    html: (manifest.statuses?.[candidate.url] ?? 200) >= 400 ? null : await readFile(resolve(root, manifest.pages[candidate.url] ?? manifest.homepage), "utf8"),
    accessIssue: (manifest.statuses?.[candidate.url] ?? 200) >= 400 ? `Official page access stopped with HTTP ${manifest.statuses?.[candidate.url]}.` : null,
    checkedAt: new Date("2026-07-25T00:00:00.000Z"),
  });
  const homepageUrl = Object.keys(manifest.pages).find((url) => manifest.pages[url] === manifest.homepage) ?? "https://www.auburn.edu/";
  return {
    studiesCatalogHtml: await readFile(resolve(root, manifest.studiesCatalog), "utf8"),
    fetchStudiesProfile: async (url) => readFile(resolve(root, manifest.studiesProfiles[url]), "utf8"),
    homepage: await snapshot({ url: homepageUrl, label: "Homepage", kind: "homepage" }),
    fetchOfficialPage: snapshot,
    fetchProgramPage: snapshot,
    delay: async () => undefined,
  };
}

async function liveDependencies(): Promise<EnrichmentDependencies> {
  const catalogResponse = await fetch(studiesOverseasUsaCatalogUrl, { redirect: "follow" });
  if (!catalogResponse.ok) throw new Error(`Studies Overseas catalog returned HTTP ${catalogResponse.status}.`);
  return {
    studiesCatalogHtml: await catalogResponse.text(),
    fetchStudiesProfile: async (url) => {
      const response = await fetch(url, { redirect: "follow" });
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        throw new Error(`Studies Overseas access stopped with HTTP ${response.status}; no bypass was attempted.`);
      }
      if (!response.ok) throw new Error(`Studies Overseas profile returned HTTP ${response.status}.`);
      return response.text();
    },
  };
}

async function main() {
  const options = parseEnrichmentCliOptions(process.argv.slice(2));
  assertEnrichmentEnabled(options);
  let enrichmentTarget: EnrichmentTarget;
  if (options.fixtureDirectory && !options.universityId) {
    const manifest = JSON.parse(await readFile(resolve(options.fixtureDirectory, "manifest.json"), "utf8")) as { target: EnrichmentTarget };
    enrichmentTarget = manifest.target;
  } else {
    const target = options.universityId
      ? await prisma.university.findUnique({
        where: { id: options.universityId },
        include: { aliases: true, sources: true },
      })
      : await prisma.university.findFirst({
        where: { country: options.country, sources: { some: { sourceName: "university-study" } } },
        include: { aliases: true, sources: true },
        orderBy: { createdAt: "asc" },
      });
    if (!target?.officialWebsiteUrl) throw new Error("Eligible university with an official website was not found.");
    enrichmentTarget = {
      id: target.id,
      name: target.name,
      slug: target.slug,
      country: target.country,
      state: target.state,
      city: target.city,
      officialWebsiteUrl: target.officialWebsiteUrl,
      verificationStatus: target.verificationStatus,
      aliases: target.aliases.map((alias) => alias.name),
      universityStudyUrl: target.sources.find((source) => source.sourceName === "university-study")?.sourceUniversityUrl ?? null,
    };
  }
  const dependencies = options.fixtureDirectory
    ? await fixtureDependencies(options.fixtureDirectory)
    : await liveDependencies();
  const result = await executeEnrichment({ dryRun: options.dryRun }, enrichmentTarget, dependencies, prisma);
  if (options.debugHtml) {
    const directory = await writeDebugSnapshots(
      [...result.officialPages, ...result.programDirectoryPages],
      enrichmentTarget.slug,
    );
    safeImportLog("university-enrichment-debug-html", { directory });
  }
  if (options.dryRun) {
    safeImportLog("university-enrichment-diagnostics", {
      diagnostics: JSON.stringify(result.diagnostics),
    });
  }
  safeImportLog("university-enrichment-complete", {
    universityId: result.universityId,
    university: result.universityName,
    dryRun: options.dryRun,
    officialPages: result.officialPages.length,
    programDirectories: result.programDirectoryPages.length,
    programs: result.programs.length,
    claims: result.claims.length,
    conflicts: result.resolvedClaims.filter((group) => group.conflictStatus !== "NONE").length,
  });
}

main().catch((error) => {
  console.error(`University enrichment stopped: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});
