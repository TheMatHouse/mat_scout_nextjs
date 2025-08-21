// app/api/auth/google/callback/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    // Compute origin and redirect_uri (env can override)
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || `${url.protocol}//${url.host}`;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/google/callback`;

    // Verify OAuth state (CSRF)
    const cookieStore = cookies(); // no await needed
    const storedState = cookieStore.get("oauth_state_google")?.value;
    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=google_state`);
    }

    // 1) Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri, // MUST match what you sent in /api/auth/google
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
    const profile = await userRes.json();

    const emailRaw = profile?.email;
    if (!emailRaw) {
      return NextResponse.redirect(`${origin}/login?error=google_no_email`);
    }
    const email = emailRaw.toLowerCase().trim();
    const name = profile?.name || "";
    const picture = profile?.picture;

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
        verified: true,
      });

      // Fire-and-forget welcome email (don’t block login if this fails)
      try {
        await sendWelcomeEmail({ to: email });
      } catch {}
    }

    // 4) Create session JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false },
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
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.delete("oauth_state_google");
    res.cookies.delete("post_auth_redirect");

    console.log(`✅ Google login successful: ${email}`);
    return res;
  } catch (err) {
    console.error("Google OAuth callback error:", err?.message || err);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google_exception`);
  }
}
