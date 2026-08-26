import { NextResponse, type NextRequest } from "next/server";
import { hasLegacyWordPressQuery } from "@/lib/seo/legacy-wordpress-query";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/" &&
    hasLegacyWordPressQuery(request.nextUrl.searchParams)
  ) {
    return new NextResponse("Gone", {
      status: 410,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
