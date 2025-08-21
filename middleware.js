// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Allowed site origins (adjust if you add more)
const ALLOW = [
  "https://matscout.com",
  "https://staging-matscout.com",
  "http://localhost:3000",
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  // --- CSRF guard for JSON writes on /api/* ---
  // Only blocks POST/PUT/PATCH/DELETE coming from other origins.
  // Allows GETs (OAuth callbacks, health checks) and OPTIONS preflights.
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
  if (method === "OPTIONS") {
    // let preflight pass
    return NextResponse.next();
  }

  // --- Your existing JWT gating (unchanged logic) ---
  const token = req.cookies.get("token")?.value;

  // Paths to protect
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isTeams =
    pathname.startsWith("/teams") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/api/teams");

  const isProtected = isDashboard || isAdmin || isTeams;

  // If no token for protected route, redirect to login
  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && isProtected) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      // Admin-only guard
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

export const config = {
  // Add /api so the CSRF guard runs for ALL API routes
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
