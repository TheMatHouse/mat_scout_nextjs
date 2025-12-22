// app/api/auth/google/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request) {
  const reqUrl = new URL(request.url);

  const origin =
    process.env.NEXT_PUBLIC_DOMAIN?.replace(/\/+$/, "") ||
    `${reqUrl.protocol}//${reqUrl.host}`;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.replace(/\/+$/, "") ||
    `${origin}/api/auth/google/callback`;

  // 🔐 Signed state instead of cookie
  const statePayload = {
    t: Date.now(),
    r: crypto.randomBytes(8).toString("hex"),
  };

  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.redirect(authUrl);
}
