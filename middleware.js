// middleware.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // Paths to protect
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isTeams =
    pathname.startsWith("/teams") || // list or section
    pathname.startsWith("/team") || // detail routes if you use /team/[slug]
    pathname.startsWith("/api/teams"); // teams APIs

  const isProtected = isDashboard || isAdmin || isTeams;

  // If no token for protected route, redirect to login
  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    // keep your existing param name
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

      return NextResponse.next();
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
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    // 🔒 Teams (pages + APIs)
    "/teams/:path*",
    "/team/:path*",
    "/api/teams/:path*",
  ],
};
