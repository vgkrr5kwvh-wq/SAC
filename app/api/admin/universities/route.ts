import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/admin-authorization";
import {
  UniversityRepository,
  type UniversityManagementFilters,
  type UniversityPublicationStatus,
  type UniversityVerificationStatus,
} from "@/lib/university-intelligence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicationStatuses: UniversityPublicationStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const verificationStatuses: UniversityVerificationStatus[] = [
  "DISCOVERED",
  "PARTNER_MATCHED",
  "OFFICIAL_VERIFIED",
  "MANUALLY_VERIFIED",
  "VERIFICATION_FAILED",
];

function supported<T extends string>(value: string | null, values: T[]): T | undefined {
  return value && values.includes(value as T) ? value as T : undefined;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAdminPermission(session.user.role, "manage_university_data")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const filters: UniversityManagementFilters = {
    query: searchParams.get("q")?.trim() || undefined,
    country: searchParams.get("country")?.trim() || undefined,
    publicationStatus: supported(searchParams.get("publicationStatus"), publicationStatuses),
    verificationStatus: supported(searchParams.get("verificationStatus"), verificationStatuses),
  };
  const result = await new UniversityRepository().listForManagement(filters);
  return Response.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
}
