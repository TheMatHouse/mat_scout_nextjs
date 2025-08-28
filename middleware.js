// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Allowed site origins (adjust if you add more)
const ALLOW = [
  "https://matscout.com",
  "https://staging-matscout.com",
  "http://localhost:3000",
];

// Endpoints that should bypass CSRF + origin checks (support server-to-server/curl)
const METRICS_PREFIXES = [
  "/api/metrics/collect",
  "/api/metrics/rollup", // includes /daily etc.
];

function isMetricsPath(pathname = "") {
  return METRICS_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // --- Allow preflight early ---
  if (method === "OPTIONS") {
    return NextResponse.next();
  }

  // --- BYPASS for metrics endpoints (collect/rollup) ---
  // These must accept server-to-server calls (no Origin/Referer), and may be called via curl.
  if (isMetricsPath(pathname)) {
    return NextResponse.next();
  }

  // --- CSRF guard for JSON writes on /api/* (excluding webhooks/health) ---
  // Blocks POST/PUT/PATCH/DELETE from other origins; allows GETs and OPTIONS.
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    !pathname.startsWith("/api/health") &&
    !pathname.startsWith("/api/webhooks/")
  ) {
    const origin = req.headers.get("origin") || "";
    const referer = req.headers.get("referer") || "";
    const sameOrigin = ALLOW.some(
      (a) => origin.startsWith(a) || referer.startsWith(a)
    );
    if (!sameOrigin) {
      return new NextResponse(JSON.stringify({ error: "bad_origin" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // --- JWT gating (unchanged logic) ---
  const token = req.cookies.get("token")?.value;

  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isTeams =
    pathname.startsWith("/teams") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/api/teams");

  const isProtected = isDashboard || isAdmin || isTeams;

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isProtected) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      if (isAdmin && !payload.isAdmin) {
        if (pathname.startsWith("/api")) {
          return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        const homeUrl = new URL("/dashboard", req.url);
        homeUrl.searchParams.set("error", "forbidden");
        return NextResponse.redirect(homeUrl);
      }
    } catch (err) {
      console.error("Invalid JWT:", err);
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Ensure middleware runs on the same paths as before, so CSRF still applies broadly
export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/teams/:path*",
    "/team/:path*",
    "/api/teams/:path*",
  ],
};
