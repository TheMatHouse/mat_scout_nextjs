import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request) {
  // 1. Generate a random state value for security (to prevent CSRF)
  const state = crypto.randomBytes(16).toString("hex");
  const origin = process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // 2. Build the Google OAuth authorization URL with required params
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile", // Request access to profile and email
    state: state,
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  // 3. Set the state in a short-lived HTTP-only cookie for verification
  const response = NextResponse.redirect(authUrl, { status: 302 });
  response.cookies.set("oauth_state_google", state, {
    httpOnly: true,
    secure: true, // use true in production (requires HTTPS)
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 5, // state cookie valid for 5 minutes
  });
  return response;
}
