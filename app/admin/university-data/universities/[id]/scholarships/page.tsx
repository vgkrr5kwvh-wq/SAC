import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ScholarshipAvailabilityFilter, ScholarshipManagementFilters, ScholarshipScopeFilter, UniversityPublicationStatus, UniversityVerificationStatus } from "@/lib/university-intelligence";
import { fetchScholarshipManagement, ScholarshipManagementApiError } from "@/lib/university-intelligence/api/scholarship-management.client";
import ScholarshipManagementView from "./scholarship-management-view";

export const dynamic = "force-dynamic";
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function supported<T extends string>(value: string | undefined, values: readonly T[]) { return value && values.includes(value as T) ? value as T : undefined; }

export function scholarshipManagementFilters(parameters: Awaited<PageSearchParams>): ScholarshipManagementFilters {
  return {
    query: first(parameters.q)?.trim() || undefined,
    availability: supported<ScholarshipAvailabilityFilter>(first(parameters.availability), ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]),
    scholarshipType: first(parameters.scholarshipType)?.trim() || undefined,
    studyLevel: first(parameters.studyLevel)?.trim() || undefined,
    scope: supported<ScholarshipScopeFilter>(first(parameters.scope), ["university-wide", "program-specific"]),
    publicationStatus: supported<UniversityPublicationStatus>(first(parameters.publicationStatus), ["DRAFT", "PUBLISHED", "ARCHIVED"]),
    verificationStatus: supported<UniversityVerificationStatus>(first(parameters.verificationStatus), ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"]),
  };
}

async function apiRequestContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("Scholarship management API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https" ? forwardedProtocol : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { origin: `${protocol}://${host}`, cookie: requestHeaders.get("cookie") ?? "" };
}

export default async function ScholarshipManagementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const { id } = await params;
  const filters = scholarshipManagementFilters(await searchParams);
  const request = await apiRequestContext();
  let data;
  try { data = await fetchScholarshipManagement(request.origin, id, filters, request.cookie); }
  catch (error) { if (error instanceof ScholarshipManagementApiError && error.status === 404) notFound(); throw error; }
  return <ScholarshipManagementView data={data} filters={filters} />;
}
