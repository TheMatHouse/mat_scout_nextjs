import { NextResponse } from "next/server";

export async function POST() {
  // ✅ Create response
  const response = NextResponse.json({ message: "Logged out" });

  // ✅ Clear the JWT token cookie
  response.cookies.set("token", "", {
    httpOnly: true,
    path: "/", // applies to entire site
    maxAge: 0, // immediately expire
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // secure in production
  });

  return response;
}
