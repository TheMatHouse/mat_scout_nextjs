// app/logout/route.js
import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  );

  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // expires immediately
  });

  return response;
}
