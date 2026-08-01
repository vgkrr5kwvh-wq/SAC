import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  ProgramManagementService,
  ProgramRepository,
  UniversityRepository,
  type ProgramManagementFilters,
  type UniversityPublicationStatus,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Access = "unauthenticated" | "forbidden" | "allowed";
type ManagementService = Pick<ProgramManagementService, "listUniversityPrograms">;
const publicationStatuses: UniversityPublicationStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAdminUniversityProgramsRequest(
  idValue: string,
  access: Access,
  filters: ProgramManagementFilters,
  service: ManagementService,
) {
  if (access === "unauthenticated") return errorResponse(401, "UNAUTHORIZED", "Authentication required.");
  if (access === "forbidden") return errorResponse(403, "FORBIDDEN", "Permission denied.");
  const id = idValue.trim();
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) return errorResponse(404, "NOT_FOUND", "University not found.");
  try {
    const payload = await service.listUniversityPrograms(id, filters);
    if (!payload) return errorResponse(404, "NOT_FOUND", "University not found.");
    return Response.json(payload, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Admin university programs request failed.");
    return errorResponse(500, "INTERNAL_ERROR", "University programs could not be loaded.");
  }
}

const service = new ProgramManagementService({
  universities: new UniversityRepository(),
  programs: new ProgramRepository(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const access: Access = !session?.user
    ? "unauthenticated"
    : hasAdminPermission(session.user.role, "manage_university_data") ? "allowed" : "forbidden";
  const searchParams = new URL(request.url).searchParams;
  const publicationStatusValue = searchParams.get("publicationStatus");
  const filters: ProgramManagementFilters = {
    query: searchParams.get("q")?.trim() || undefined,
    degreeLevel: searchParams.get("degreeLevel")?.trim() || undefined,
    campus: searchParams.get("campus")?.trim() || undefined,
    intake: searchParams.get("intake")?.trim() || undefined,
    publicationStatus: publicationStatuses.includes(publicationStatusValue as UniversityPublicationStatus)
      ? publicationStatusValue as UniversityPublicationStatus : undefined,
  };
  return handleAdminUniversityProgramsRequest((await context.params).id, access, filters, service);
}
