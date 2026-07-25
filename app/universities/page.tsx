import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import type { UniversityVerificationStatus } from "@/lib/university-intelligence";
import {
  fetchUniversitySearch,
  type UniversityExplorerFilters,
} from "@/lib/university-intelligence/api/university-search.client";
import UniversityExplorer from "./_components/university-explorer";

export const metadata: Metadata = {
  title: "Explore Universities",
  description:
    "Search verified university information by location and source status with Self Apply Center.",
  alternates: { canonical: "/universities" },
};

type PageSearchParams = Promise<Record<
  string,
  string | string[] | undefined
>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function pageNumber(value: string | undefined): number {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

function verificationStatus(
  value: string | undefined,
): UniversityVerificationStatus | undefined {
  const supported: UniversityVerificationStatus[] = [
    "DISCOVERED",
    "PARTNER_MATCHED",
    "OFFICIAL_VERIFIED",
    "MANUALLY_VERIFIED",
    "VERIFICATION_FAILED",
  ];
  return supported.includes(value as UniversityVerificationStatus)
    ? value as UniversityVerificationStatus
    : undefined;
}

function filtersFromSearchParams(
  parameters: Awaited<PageSearchParams>,
): UniversityExplorerFilters {
  return {
    query: first(parameters.q)?.trim() || undefined,
    country: first(parameters.country)?.trim() || undefined,
    verificationStatus: verificationStatus(
      first(parameters.verificationStatus),
    ),
    verifiedOnly: first(parameters.verifiedOnly) === "true",
    page: pageNumber(first(parameters.page)),
  };
}

async function searchApiOrigin(): Promise<string> {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host")
    ?? requestHeaders.get("host");
  if (!host) throw new Error("Search API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${host}`;
}

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const filters = filtersFromSearchParams(await searchParams);
  let response;
  try {
    response = await fetchUniversitySearch(
      await searchApiOrigin(),
      filters,
    );
  } catch {
    response = undefined;
  }

  return (
    <main>
      <section className="inner-hero university-explorer-hero">
        <div className="shell inner-hero-grid">
          <div>
            <span className="eyebrow">University Intelligence</span>
            <h1>Explore Universities</h1>
            <p>
              Search a growing directory of university facts, locations, and
              verification details from reviewed sources.
            </p>
          </div>
          <div className="breadcrumb">
            <Link href="/">Home</Link>
            <span>→</span>
            <strong>Universities</strong>
          </div>
        </div>
      </section>
      <UniversityExplorer
        filters={filters}
        response={response}
        hasError={!response}
      />
    </main>
  );
}
