import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { portalRateLimiter } from "@/lib/rate-limit";
import { nl } from "@/messages/nl";

// Next.js 16 renamed `middleware` → `proxy` (runs on the nodejs runtime, so the
// in-memory rate limiter keeps state across requests). Guards the public athlete
// portal only.
export const config = {
  matcher: "/athlete/view/:path*",
};

function withPublicHeaders(res: NextResponse): NextResponse {
  // Keep the portal out of search indexes, and stop the view-token (which lives
  // in the URL) leaking to any external resource via the Referer header (Ch10).
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export function proxy(request: NextRequest): NextResponse {
  // Rate-limit by IP + view-token so one client can't hammer the portal.
  const token = request.nextUrl.pathname.split("/")[3] ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = portalRateLimiter.check(`${ip}:${token}`);

  if (!ok) {
    return withPublicHeaders(
      new NextResponse(nl.portal.rateLimited, {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );
  }

  return withPublicHeaders(NextResponse.next());
}
