import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request) {
  // CSRF state
  const state = crypto.randomBytes(16).toString("hex");

  const reqUrl = new URL(request.url);
  const origin =
    process.env.NEXT_PUBLIC_DOMAIN?.trim() ||
    `${reqUrl.protocol}//${reqUrl.host}`;

  // Prefer explicit env per environment; else fall back to origin
  const redirectUri =
    process.env.FACEBOOK_REDIRECT_URI?.trim() ||
    `${origin}/api/auth/facebook/callback`;

  // Build Facebook auth URL (keep your current Graph version)
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });
  const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?${params.toString()}`;

  // Cookie: secure on https/prod; allow non-secure on localhost
  const isHttps = reqUrl.protocol === "https:";
  const secure = process.env.NODE_ENV === "production" || isHttps;

  const res = NextResponse.redirect(authUrl, { status: 302 });
  res.cookies.set("oauth_state_facebook", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });
  return res;
}
