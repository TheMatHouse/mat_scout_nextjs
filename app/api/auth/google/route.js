// app/api/auth/google/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const reqUrl = new URL(request.url);

  // ------------------------------------------------------------
  // Resolve origin safely (NO trailing slash)
  // ------------------------------------------------------------
  const origin = (
    process.env.NEXT_PUBLIC_DOMAIN?.trim() ||
    `${reqUrl.protocol}//${reqUrl.host}`
  ).replace(/\/+$/, "");

  const redirectUri = (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${origin}/api/auth/google/callback`
  ).replace(/\/+$/, "");

  // ------------------------------------------------------------
  // CSRF state (random)
  // ------------------------------------------------------------
  const state = crypto.randomBytes(16).toString("hex");

  // ------------------------------------------------------------
  // Build Google OAuth URL
  // ------------------------------------------------------------
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  // ------------------------------------------------------------
  // Cookie config — THIS IS THE STAGING FIX
  // ------------------------------------------------------------
  const hostname = new URL(origin).hostname;

  const res = NextResponse.redirect(authUrl, { status: 302 });

  res.cookies.set("oauth_state_google", state, {
    httpOnly: true,
    secure: true, // HTTPS only (required on Vercel)
    sameSite: "lax",
    path: "/",
    domain: hostname, // 🔑 critical fix for staging
    maxAge: 60 * 5, // 5 minutes
  });

  return res;
}
