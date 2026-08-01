import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  fetchUniversityManagementDetail,
  UniversityManagementDetailApiError,
} from "@/lib/university-intelligence/api/university-management-detail.client";
import UniversityManagementOverview from "./_components/university-management-overview";

export const dynamic = "force-dynamic";

async function apiRequestContext() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("University management API origin is unavailable.");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return { origin: `${protocol}://${host}`, cookie: requestHeaders.get("cookie") ?? "" };
}

export default async function UniversityManagementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await apiRequestContext();
  let data;
  try {
    data = await fetchUniversityManagementDetail(request.origin, id, request.cookie);
  } catch (error) {
    if (error instanceof UniversityManagementDetailApiError && error.status === 404) notFound();
    throw error;
  }
  return <UniversityManagementOverview data={data} />;
}
