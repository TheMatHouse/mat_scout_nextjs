// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // --- Public paths (ALWAYS allow) ---
  if (
    pathname === "/" ||
    pathname === "/teams" ||
    pathname.startsWith("/teams/") || // <-- public team detail pages
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/rt-analytics.html" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // --- Metrics APIs: allow; routes do their own auth/secret checks ---
  if (
    pathname === "/api/metrics/collect" ||
    pathname.startsWith("/api/metrics/rollup")
  ) {
    return NextResponse.next();
  }

  // --- Optionally allow other public APIs here (health checks, og images, etc.) ---
  if (pathname.startsWith("/api/og")) {
    return NextResponse.next();
  }

  // --- Protected app areas (require session) ---
  const PROTECTED_PREFIXES = [
    "/dashboard",
    "/admin",
    "/account",
    "/team", // internal team management area
    "/settings",
    "/scouting", // example protected areas—adjust to your app
  ];

  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (requiresAuth) {
    // Minimal session check. If you use a different cookie/header, adjust here.
    const hasSession =
      req.cookies.get("session")?.value ||
      req.cookies.get("token")?.value ||
      req.headers.get("authorization");

    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + (search || ""));
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Run on most paths but skip common static assets by default
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
