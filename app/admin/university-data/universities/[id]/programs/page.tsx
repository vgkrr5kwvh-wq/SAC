import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ProgramManagementFilters, UniversityPublicationStatus } from "@/lib/university-intelligence";
import {
  fetchProgramManagement,
  ProgramManagementApiError,
} from "@/lib/university-intelligence/api/program-management.client";
import ProgramManagementView from "./program-management-view";

export const dynamic = "force-dynamic";
type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function programManagementFilters(parameters: Awaited<PageSearchParams>): ProgramManagementFilters {
  const publicationStatus = first(parameters.publicationStatus);
  return {
    query: first(parameters.q)?.trim() || undefined,
    degreeLevel: first(parameters.degreeLevel)?.trim() || undefined,
    campus: first(parameters.campus)?.trim() || undefined,
    intake: first(parameters.intake)?.trim() || undefined,
    publicationStatus: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(publicationStatus ?? "")
      ? publicationStatus as UniversityPublicationStatus : undefined,
  };
}

async function apiRequestContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("Program management API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { origin: `${protocol}://${host}`, cookie: requestHeaders.get("cookie") ?? "" };
}

export default async function ProgramManagementPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: PageSearchParams }) {
  const { id } = await params;
  const filters = programManagementFilters(await searchParams);
  const request = await apiRequestContext();
  let data;
  try {
    data = await fetchProgramManagement(request.origin, id, filters, request.cookie);
  } catch (error) {
    if (error instanceof ProgramManagementApiError && error.status === 404) notFound();
    throw error;
  }
  return <ProgramManagementView data={data} filters={filters} />;
}
