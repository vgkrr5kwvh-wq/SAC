import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  ScholarshipManagementService,
  ScholarshipRepository,
  UniversityRepository,
  type ScholarshipAvailabilityFilter,
  type ScholarshipManagementFilters,
  type ScholarshipScopeFilter,
  type UniversityPublicationStatus,
  type UniversityVerificationStatus,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Access = "unauthenticated" | "forbidden" | "allowed";
type ManagementService = Pick<ScholarshipManagementService, "listUniversityScholarships">;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAdminUniversityScholarshipsRequest(
  idValue: string,
  access: Access,
  filters: ScholarshipManagementFilters,
  service: ManagementService,
) {
  if (access === "unauthenticated") return errorResponse(401, "UNAUTHORIZED", "Authentication required.");
  if (access === "forbidden") return errorResponse(403, "FORBIDDEN", "Permission denied.");
  const id = idValue.trim();
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) return errorResponse(404, "NOT_FOUND", "University not found.");
  try {
    const payload = await service.listUniversityScholarships(id, filters);
    if (!payload) return errorResponse(404, "NOT_FOUND", "University not found.");
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Admin university scholarships request failed.");
    return errorResponse(500, "INTERNAL_ERROR", "University scholarships could not be loaded.");
  }
}

function supported<T extends string>(value: string | null, values: readonly T[]): T | undefined {
  return value && values.includes(value as T) ? value as T : undefined;
}

const service = new ScholarshipManagementService({ universities: new UniversityRepository(), scholarships: new ScholarshipRepository() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const access: Access = !session?.user ? "unauthenticated" : hasAdminPermission(session.user.role, "manage_university_data") ? "allowed" : "forbidden";
  const searchParams = new URL(request.url).searchParams;
  const filters: ScholarshipManagementFilters = {
    query: searchParams.get("q")?.trim() || undefined,
    availability: supported<ScholarshipAvailabilityFilter>(searchParams.get("availability"), ["AVAILABLE", "UNAVAILABLE", "UNKNOWN"]),
    scholarshipType: searchParams.get("scholarshipType")?.trim() || undefined,
    studyLevel: searchParams.get("studyLevel")?.trim() || undefined,
    scope: supported<ScholarshipScopeFilter>(searchParams.get("scope"), ["university-wide", "program-specific"]),
    publicationStatus: supported<UniversityPublicationStatus>(searchParams.get("publicationStatus"), ["DRAFT", "PUBLISHED", "ARCHIVED"]),
    verificationStatus: supported<UniversityVerificationStatus>(searchParams.get("verificationStatus"), ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"]),
  };
  return handleAdminUniversityScholarshipsRequest((await context.params).id, access, filters, service);
}
