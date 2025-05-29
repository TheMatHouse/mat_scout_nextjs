// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect("/");
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0), // expires immediately
  });
  return response;
}
