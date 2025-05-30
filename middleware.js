// middleware.js
import { NextResponse } from "next/server";
import { parse } from "cookie";

export function middleware(req) {
  const cookie = req.headers.get("cookie") || "";
  const { token } = parse(cookie);

  if (!token && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
