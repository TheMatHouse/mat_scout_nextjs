// middleware.js
import { NextResponse } from "next/server";

/** Cookie that lets admins bypass the maintenance gate */
const BYPASS_COOKIE = "ms_maintenance_bypass";

/** Paths we never block */
const ALWAYS_ALLOW_PREFIXES = [
  "/api/public/",
  "/_next/",
  "/assets/",
  "/favicon.ico",
  "/rt-analytics.html",
  "/robots.txt",
  "/sitemap.xml",
  "/api/metrics/collect",
  "/api/metrics/rollup",
  "/api/og",
  "/maintenance",
];

/** Public pages */
const PUBLIC_PAGES = new Set([
  "/",
  "/teams",
  "/login",
  "/register",
  "/forgot-password",
]);

/** Protected app areas */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/account",
  "/team",
  "/settings",
  "/scouting",
];

function startsWithAny(pathname, prefixes) {
  for (const p of prefixes) if (pathname.startsWith(p)) return true;
  return false;
}

export function middleware(req) {
  const url = req.nextUrl;
  const { pathname, searchParams } = url;

  // 🚨 HARD STOP for auth & maintenance pages
  // This PREVENTS infinite redirect loops
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/maintenance"
  ) {
    return NextResponse.next();
  }

  // --- 0) Always-allow ---
  if (startsWithAny(pathname, ALWAYS_ALLOW_PREFIXES)) {
    return NextResponse.next();
  }

  // --- 1) Admin bypass flag ---
  if (searchParams.get("bypass_maintenance") === "1") {
    const redirect = NextResponse.redirect(new URL(pathname, req.url));
    redirect.cookies.set(BYPASS_COOKIE, "1", { path: "/" });
    return redirect;
  }

  // --- 2) Maintenance bypass cookie ---
  const bypass = req.cookies.get(BYPASS_COOKIE)?.value === "1";

  // --- 3) Auth gating only (NO NETWORK CALLS) ---
  return handleAuth(req, { bypass });
}

/**
 * Auth logic — MUST NEVER THROW
 */
function handleAuth(req, { bypass }) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // APIs handle auth themselves
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Public routes
  if (
    PUBLIC_PAGES.has(pathname) ||
    pathname.startsWith("/teams/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Metrics & OG
  if (
    pathname === "/api/metrics/collect" ||
    pathname.startsWith("/api/metrics/rollup") ||
    pathname.startsWith("/api/og")
  ) {
    return NextResponse.next();
  }

  // Protected areas require session
  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (requiresAuth && !bypass) {
    const hasSession =
      req.cookies.get("session")?.value ||
      req.cookies.get("token")?.value ||
      req.cookies.get("ms_session")?.value ||
      req.cookies.get("jwt")?.value ||
      req.cookies.get("next-auth.session-token")?.value ||
      req.cookies.get("__Secure-next-auth.session-token")?.value ||
      req.headers.get("authorization");

    if (!hasSession) {
      const redirectTo = url.clone();
      redirectTo.pathname = "/login";
      redirectTo.searchParams.set("next", pathname + (search || ""));
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
