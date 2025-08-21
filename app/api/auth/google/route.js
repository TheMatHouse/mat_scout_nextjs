// app/api/auth/google/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request) {
  // 1) CSRF state
  const state = crypto.randomBytes(16).toString("hex");

  // 2) Compute redirect_uri:
  //    Prefer explicit env; else fall back to NEXT_PUBLIC_DOMAIN; else request origin.
  const reqUrl = new URL(request.url);
  const origin =
    process.env.NEXT_PUBLIC_DOMAIN?.trim() ||
    `${reqUrl.protocol}//${reqUrl.host}`;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${origin}/api/auth/google/callback`;

  // 3) Build Google auth URL (add access_type/prompt if you want refresh tokens)
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    // access_type: "offline",   // <-- uncomment if you want refresh tokens
    // prompt: "consent",        // <-- forces refresh_token every time
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

  // 4) Set state cookie (secure only on https/prod so it works on localhost)
  const isHttps = reqUrl.protocol === "https:";
  const secure = process.env.NODE_ENV === "production" || isHttps;

  const res = NextResponse.redirect(authUrl, { status: 302 });
  res.cookies.set("oauth_state_google", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });
  return res;
}
