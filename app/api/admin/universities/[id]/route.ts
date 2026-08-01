import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  ProgramRepository,
  ScholarshipRepository,
  UniversityManagementService,
  UniversityRepository,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Access = "unauthenticated" | "forbidden" | "allowed";
type OverviewService = Pick<UniversityManagementService, "getOverview">;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAdminUniversityOverviewRequest(
  idValue: string,
  access: Access,
  service: OverviewService,
): Promise<Response> {
  if (access === "unauthenticated") return errorResponse(401, "UNAUTHORIZED", "Authentication required.");
  if (access === "forbidden") return errorResponse(403, "FORBIDDEN", "Permission denied.");
  const id = idValue.trim();
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(id)) return errorResponse(404, "NOT_FOUND", "University not found.");
  try {
    const result = await service.getOverview(id);
    if (!result) return errorResponse(404, "NOT_FOUND", "University not found.");
    return Response.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    console.error("Admin university overview request failed.");
    return errorResponse(500, "INTERNAL_ERROR", "The university overview could not be loaded.");
  }
}

const service = new UniversityManagementService({
  universities: new UniversityRepository(),
  programs: new ProgramRepository(),
  scholarships: new ScholarshipRepository(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const access: Access = !session?.user
    ? "unauthenticated"
    : hasAdminPermission(session.user.role, "manage_university_data") ? "allowed" : "forbidden";
  return handleAdminUniversityOverviewRequest((await context.params).id, access, service);
}
