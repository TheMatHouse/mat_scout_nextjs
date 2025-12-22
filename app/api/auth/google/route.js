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

  // 🔐 Signed state
  const statePayload = {
    t: Date.now(),
    r: crypto.randomBytes(8).toString("hex"),
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  // ✅ Capture redirect from query (?redirect=...)
  const redirect =
    reqUrl.searchParams.get("redirect") ||
    reqUrl.searchParams.get("next") ||
    null;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  const res = NextResponse.redirect(authUrl);

  // ✅ Persist post-auth redirect safely
  if (redirect && redirect.startsWith("/")) {
    res.cookies.set("post_auth_redirect", redirect, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
      secure: true,
    });
  }

  return res;
}
