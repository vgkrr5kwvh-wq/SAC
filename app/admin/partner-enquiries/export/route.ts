import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { limitExportRecords } from "@/lib/admin-enquiry-csv";
import {
  buildPartnerEnquiriesCsv,
  buildPartnerExportFilename,
} from "@/lib/admin-partner-enquiry-csv";
import {
  buildPartnerEnquirySearchWhere,
  sanitizeSearchParameter,
} from "@/lib/admin-partner-enquiry-params";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/admin-authorization";

const exportLimit = 10_000;

function serverErrorResponse(): Response {
  return new Response("Unable to export partner enquiries.", {
    status: 500,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await auth();
  } catch {
    return serverErrorResponse();
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!hasAdminPermission(session.user.role, "manage_enquiries")) return new Response("Forbidden", { status: 403 });

  const query = sanitizeSearchParameter(request.nextUrl.searchParams.get("q"));
  const where = buildPartnerEnquirySearchWhere(query);

  let enquiries;
  try {
    enquiries = await prisma.partnerEnquiry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: exportLimit + 1,
      select: {
        partnerType: true,
        contactName: true,
        workEmail: true,
        organisation: true,
        locations: true,
        partnershipProposal: true,
        details: true,
        additionalDetails: true,
        notificationStatus: true,
        createdAt: true,
      },
    });
  } catch {
    return serverErrorResponse();
  }

  try {
    const limitedExport = limitExportRecords(enquiries, exportLimit);
    const csv = buildPartnerEnquiriesCsv(limitedExport.records);
    const filename = buildPartnerExportFilename(new Date());

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Export-Truncated": String(limitedExport.truncated),
      },
    });
  } catch {
    return serverErrorResponse();
  }
}
