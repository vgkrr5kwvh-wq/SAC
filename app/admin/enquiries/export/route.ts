import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildStudentEnquiriesCsv,
  buildStudentExportFilename,
} from "@/lib/admin-enquiry-csv";
import {
  buildEnquirySearchWhere,
  sanitizeSearchParameter,
} from "@/lib/admin-enquiry-params";
import { prisma } from "@/lib/prisma";

const exportLimit = 10_000;

function serverErrorResponse(): Response {
  return new Response("Unable to export enquiries.", {
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

  const query = sanitizeSearchParameter(request.nextUrl.searchParams.get("q"));
  const where = buildEnquirySearchWhere(query);

  let enquiries;
  try {
    enquiries = await prisma.enquiry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: exportLimit + 1,
      select: {
        name: true,
        email: true,
        interest: true,
        message: true,
        notificationStatus: true,
        createdAt: true,
      },
    });
  } catch {
    return serverErrorResponse();
  }

  const truncated = enquiries.length > exportLimit;
  const csv = buildStudentEnquiriesCsv(enquiries.slice(0, exportLimit));
  const filename = buildStudentExportFilename(new Date());

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Export-Truncated": String(truncated),
    },
  });
}
