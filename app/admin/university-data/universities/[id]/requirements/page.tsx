import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { AdmissionRequirementManagementFilters, UniversityPublicationStatus, UniversityVerificationStatus } from "@/lib/university-intelligence";
import { AdmissionRequirementManagementApiError, fetchAdmissionRequirementManagement } from "@/lib/university-intelligence/api/admission-requirement-management.client";
import AdmissionRequirementManagementView from "./requirement-management-view";

export const dynamic = "force-dynamic";
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;
function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export function admissionRequirementManagementFilters(parameters: Awaited<PageSearchParams>): AdmissionRequirementManagementFilters {
  const publication = first(parameters.publicationStatus);
  const verification = first(parameters.verificationStatus);
  const scope = first(parameters.scope);
  return {
    query: first(parameters.q)?.trim() || undefined,
    studyLevel: first(parameters.studyLevel)?.trim() || undefined,
    degreeLevel: first(parameters.degreeLevel)?.trim() || undefined,
    programId: first(parameters.programId)?.trim() || undefined,
    publicationStatus: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(publication ?? "") ? publication as UniversityPublicationStatus : undefined,
    verificationStatus: ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"].includes(verification ?? "") ? verification as UniversityVerificationStatus : undefined,
    scope: scope === "university-wide" || scope === "program-specific" ? scope : undefined,
  };
}

async function apiRequestContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("Admission requirement management API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https" ? forwardedProtocol : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { origin: `${protocol}://${host}`, cookie: requestHeaders.get("cookie") ?? "" };
}

export default async function AdmissionRequirementsManagementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const { id } = await params;
  const filters = admissionRequirementManagementFilters(await searchParams);
  const request = await apiRequestContext();
  let data;
  try {
    data = await fetchAdmissionRequirementManagement(request.origin, id, filters, request.cookie);
  } catch (error) {
    if (error instanceof AdmissionRequirementManagementApiError && error.status === 404) notFound();
    throw error;
  }
  return <AdmissionRequirementManagementView data={data} filters={filters} />;
}
