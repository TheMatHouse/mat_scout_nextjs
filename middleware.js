import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  // Paths to protect
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // If no token for protected route, redirect to login
  if ((isDashboard || isAdmin) && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      // If route is admin-only, check isAdmin flag
      if (isAdmin && !payload.isAdmin) {
        if (pathname.startsWith("/api")) {
          return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        // ✅ Redirect non-admin to home with error param
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
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/admin/:path*"],
};
