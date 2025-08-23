// app/api/auth/google/callback/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    if (!JWT_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("Missing envs for Google OAuth/JWT");
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(`${origin}/login?error=server_env`);
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    const origin = (
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || `${url.protocol}//${url.host}`
    ) // e.g. http://localhost:3000
      .replace(/\/+$/, "");
    const redirectUri = (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/google/callback`
    ).replace(/\/+$/, "");

    // ✅ cookies() must be awaited in your runtime
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_google")?.value || null;

    if (!code || !returnedState || returnedState !== storedState) {
      // Clear the state cookie to avoid stickiness
      const bad = NextResponse.redirect(`${origin}/login?error=google_state`);
      bad.cookies.set("oauth_state_google", "", { path: "/", maxAge: 0 });
      return bad;
    }

    // 1) Exchange authorization code for tokens
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
      const detail = await tokenRes.text();
      return NextResponse.redirect(
        `${origin}/login?error=google_token&detail=${encodeURIComponent(
          detail
        )}`
      );
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(
        `${origin}/login?error=google_no_access_token`
      );
    }

    // 2) Fetch Google profile
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

    // 3) Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      const [firstName = "", ...rest] = name.split(" ");
      const lastName = rest.join(" ");
      const username = email.split("@")[0];

      user = await User.create({
        firstName,
        lastName,
        username,
        email,
        googleAvatar: picture,
        avatar: picture,
        avatarType: "google",
        provider: "google",
        isVerified: true, // ⬅️ use consistent field name
      });

      // Fire-and-forget welcome email
      try {
        await sendWelcomeEmail({ to: email });
      } catch (e) {
        console.warn("Welcome email failed (non-blocking):", e?.message || e);
      }
    }

    // 4) Create session JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: !!user.isAdmin },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5) Post-auth redirect
    const postRedirect = cookieStore.get("post_auth_redirect")?.value;
    const safeRedirect =
      postRedirect && postRedirect.startsWith("/")
        ? postRedirect
        : "/dashboard";
    const target = `${origin}${safeRedirect}`;

    // 6) Set cookie + cleanup
    const res = NextResponse.redirect(target);
    res.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.set("oauth_state_google", "", { path: "/", maxAge: 0 });
    res.cookies.set("post_auth_redirect", "", { path: "/", maxAge: 0 });

    console.log(`✅ Google login successful: ${email}`);
    return res;
  } catch (err) {
    console.error("Google OAuth callback error:", err?.message || err);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google_exception`);
  }
}
