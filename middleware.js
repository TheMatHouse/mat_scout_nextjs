// middleware.js
import { NextResponse } from "next/server";

/** Cookie that lets admins bypass the maintenance gate */
const BYPASS_COOKIE = "ms_maintenance_bypass";

/** Paths we never block (assets, public APIs, maintenance page, etc.) */
const ALWAYS_ALLOW_PREFIXES = [
  "/api/public/", // allow all public APIs
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

/** Public pages that remain accessible when not in maintenance */
const PUBLIC_PAGES = new Set([
  "/",
  "/teams",
  "/login",
  "/register",
  "/forgot-password",
]);

/** App areas that require a session when NOT in maintenance mode */
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

export async function middleware(req) {
  const url = req.nextUrl;
  const { pathname, searchParams } = url;

  // --- 0) Always-allow list (short-circuit) ---
  if (startsWithAny(pathname, ALWAYS_ALLOW_PREFIXES)) {
    return NextResponse.next();
  }

  // --- 0.1) Admin surfaces SKIP the MAINTENANCE GATE (but still go through auth) ---
  // This lets an admin turn maintenance OFF after turning it ON.
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/admin")) {
    return handleAuth(req);
  }

  // Treat these as public (when not in maintenance). Subroutes like /teams/[slug] flow through maintenance check.
  if (PUBLIC_PAGES.has(pathname) || pathname.startsWith("/teams/")) {
    // fall through to maintenance check
  }

  // --- 1) Admin bypass via ?bypass_maintenance=1 sets a cookie ---
  if (searchParams.get("bypass_maintenance") === "1") {
    const redirect = NextResponse.redirect(new URL(pathname, req.url));
    redirect.cookies.set(BYPASS_COOKIE, "1", { path: "/" });
    return redirect;
  }

  // If bypass cookie present, skip maintenance gate entirely
  if (req.cookies.get(BYPASS_COOKIE)?.value === "1") {
    return handleAuth(req);
  }

  // --- 2) Maintenance mode check (safe JSON parse; fail open) ---
  try {
    const statusUrl = new URL("/api/public/maintenance", req.url);
    const r = await fetch(statusUrl, { cache: "no-store" });

    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.includes("application/json")) {
      // Fail open: do NOT block or parse non-JSON
      return handleAuth(req);
    }

    const data = await r.json().catch(() => null);
    if (!data) return handleAuth(req);

    const mode = String(data?.maintenanceMode || "off");
    if (mode !== "off") {
      if (pathname !== "/maintenance") {
        const reason = mode === "updating" ? "updating" : "maintenance";
        const to = new URL("/maintenance", req.url);
        to.searchParams.set("reason", reason);
        return NextResponse.redirect(to);
      }
      // already on /maintenance → render it
      return NextResponse.next();
    }
  } catch {
    // Any error reading status → fail open
    return handleAuth(req);
  }

  // --- 3) Normal auth gating (only when not in maintenance) ---
  return handleAuth(req);
}

/** Auth logic; admin still enforced, non-admin APIs never redirected to HTML */
function handleAuth(req) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // Let non-admin API routes handle auth themselves (return JSON 401/403, not HTML redirects)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Public pages & public APIs
  if (
    pathname === "/" ||
    pathname === "/teams" ||
    pathname.startsWith("/teams/") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/rt-analytics.html" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/public/")
  ) {
    return NextResponse.next();
  }

  // Metrics & OG APIs
  if (
    pathname === "/api/metrics/collect" ||
    pathname.startsWith("/api/metrics/rollup")
  ) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/og")) {
    return NextResponse.next();
  }

  // Protected areas require a session
  const requiresAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (requiresAuth) {
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

// Run on most paths but skip common static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
