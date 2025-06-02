import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request) {
  const state = crypto.randomBytes(16).toString("hex");
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/facebook/callback`;

  // Facebook OAuth dialog URL with scopes for email and public profile
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state: state,
  });
  const authUrl = `https://www.facebook.com/v17.0/dialog/oauth?${params.toString()}`;

  const response = NextResponse.redirect(authUrl, { status: 302 });
  response.cookies.set("oauth_state_facebook", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 5,
  });
  return response;
}
