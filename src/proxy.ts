import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { portalRateLimiter } from "@/lib/rate-limit";
import { DEFAULT_LOCALE, isLocale, messages } from "@/messages";

// proxy runs before the request reaches React, so it reads the locale cookie
// directly (it can't use the next/headers-based getLocale).
const LOCALE_COOKIE = "lgj_locale";

// Next.js 16 renamed `middleware` → `proxy` (runs on the nodejs runtime, so the
// in-memory rate limiter keeps state across requests). Guards the public surfaces:
// the athlete portal, the athlete-prepare page, and the parental-consent page. The
// token is always the last path segment, so the handler parses it generically.
export const config = {
  matcher: [
    "/athlete/view/:path*",
    "/feedback/prepare/:path*",
    "/consent/:path*",
  ],
};

function withPublicHeaders(res: NextResponse): NextResponse {
  // Keep the portal out of search indexes, and stop the view-token (which lives
  // in the URL) leaking to any external resource via the Referer header (Ch10).
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}

export function proxy(request: NextRequest): NextResponse {
  // Rate-limit by IP + token (last path segment) so one client can't hammer it.
  const token =
    request.nextUrl.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = portalRateLimiter.check(`${ip}:${token}`);

  if (!ok) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
    return withPublicHeaders(
      new NextResponse(messages[locale].portal.rateLimited, {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );
  }

  return withPublicHeaders(NextResponse.next());
}
