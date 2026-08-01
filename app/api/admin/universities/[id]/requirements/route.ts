import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  AdmissionRequirementManagementService,
  AdmissionRequirementRepository,
  UniversityRepository,
  type AdmissionRequirementManagementFilters,
  type UniversityPublicationStatus,
  type UniversityVerificationStatus,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Access = "unauthenticated" | "forbidden" | "allowed";
type Service = Pick<AdmissionRequirementManagementService, "listUniversityRequirements">;
const publications: UniversityPublicationStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const verifications: UniversityVerificationStatus[] = ["DISCOVERED", "PARTNER_MATCHED", "OFFICIAL_VERIFIED", "MANUALLY_VERIFIED", "VERIFICATION_FAILED"];

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAdminUniversityRequirementsRequest(idValue: string, access: Access, filters: AdmissionRequirementManagementFilters, service: Service) {
  if (access === "unauthenticated") return errorResponse(401, "UNAUTHORIZED", "Authentication required.");
  if (access === "forbidden") return errorResponse(403, "FORBIDDEN", "Permission denied.");
  const id = idValue.trim();
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) return errorResponse(404, "NOT_FOUND", "University not found.");
  try {
    const payload = await service.listUniversityRequirements(id, filters);
    if (!payload) return errorResponse(404, "NOT_FOUND", "University not found.");
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Admin university requirements request failed.");
    return errorResponse(500, "INTERNAL_ERROR", "University admission requirements could not be loaded.");
  }
}

const service = new AdmissionRequirementManagementService({ universities: new UniversityRepository(), requirements: new AdmissionRequirementRepository() });

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const access: Access = !session?.user ? "unauthenticated" : hasAdminPermission(session.user.role, "manage_university_data") ? "allowed" : "forbidden";
  const params = new URL(request.url).searchParams;
  const publication = params.get("publicationStatus");
  const verification = params.get("verificationStatus");
  const scope = params.get("scope");
  const filters: AdmissionRequirementManagementFilters = {
    query: params.get("q")?.trim() || undefined,
    studyLevel: params.get("studyLevel")?.trim() || undefined,
    degreeLevel: params.get("degreeLevel")?.trim() || undefined,
    programId: params.get("programId")?.trim() || undefined,
    publicationStatus: publications.includes(publication as UniversityPublicationStatus) ? publication as UniversityPublicationStatus : undefined,
    verificationStatus: verifications.includes(verification as UniversityVerificationStatus) ? verification as UniversityVerificationStatus : undefined,
    scope: scope === "university-wide" || scope === "program-specific" ? scope : undefined,
  };
  return handleAdminUniversityRequirementsRequest((await context.params).id, access, filters, service);
}
