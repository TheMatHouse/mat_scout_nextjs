export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { sanitizeUsername, isUsernameFormatValid } from "@/lib/identifiers";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

/* ------------------------------------------------------------
   Helper: generate a valid + unique username
------------------------------------------------------------ */
async function generateUniqueUsername(base) {
  let baseCandidate = sanitizeUsername(base);

  // Ensure minimum length
  if (baseCandidate.length < 3) {
    baseCandidate = "user";
  }

  let attempt = baseCandidate;
  let suffix = 0;

  while (true) {
    // Respect RESERVED + regex rules
    if (isUsernameFormatValid(attempt)) {
      const exists = await User.exists({ username: attempt });
      if (!exists) return attempt;
    }

    suffix += 1;
    attempt = `${baseCandidate}${suffix}`.slice(0, 30);
  }
}

/* ------------------------------------------------------------
   Google OAuth Callback
------------------------------------------------------------ */
export async function GET(request) {
  try {
    if (!JWT_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(`${origin}/login?error=server_env`);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    const origin = (
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || `${url.protocol}//${url.host}`
    ).replace(/\/+$/, "");

    const redirectUri = (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/google/callback`
    ).replace(/\/+$/, "");

    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_google")?.value || null;

    if (!code || !returnedState || returnedState !== storedState) {
      const bad = NextResponse.redirect(`${origin}/login?error=google_state`);
      bad.cookies.set("oauth_state_google", "", { path: "/", maxAge: 0 });
      return bad;
    }

    /* ---------------- Exchange code for tokens ---------------- */
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=google_token`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${origin}/login?error=google_no_access_token`
      );
    }

    /* ---------------- Fetch Google profile ---------------- */
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!userRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=google_userinfo`);
    }

    const profile = await userRes.json();

    const emailRaw = profile?.email;
    if (!emailRaw) {
      return NextResponse.redirect(`${origin}/login?error=google_no_email`);
    }

    const email = emailRaw.toLowerCase().trim();
    const name = (profile?.name || "").trim();
    const picture = profile?.picture || "";

    await connectDB();

    /* ---------------- Find or create user ---------------- */
    let user = await User.findOne({ email });

    if (!user) {
      const [firstName = "", ...rest] = name.split(" ");
      const lastName = rest.join(" ");
      const baseUsername = email.split("@")[0];
      const username = await generateUniqueUsername(baseUsername);

      user = await User.create({
        firstName,
        lastName,
        username,
        email,
        googleAvatar: picture,
        avatar: picture,
        avatarType: "google",
        provider: "google",
        verified: true,
      });

      // Fire-and-forget welcome email
      try {
        await sendWelcomeEmail({ to: email });
      } catch (e) {
        console.warn("Welcome email failed:", e?.message || e);
      }
    }

    /* ---------------- Create session JWT ---------------- */
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: !!user.isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const postRedirect = cookieStore.get("post_auth_redirect")?.value;
    const safeRedirect =
      postRedirect && postRedirect.startsWith("/")
        ? postRedirect
        : "/dashboard";

    const res = NextResponse.redirect(`${origin}${safeRedirect}`);

    res.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.cookies.set("oauth_state_google", "", { path: "/", maxAge: 0 });
    res.cookies.set("post_auth_redirect", "", { path: "/", maxAge: 0 });

    return res;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google_exception`);
  }
}
