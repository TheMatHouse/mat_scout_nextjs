// app/api/auth/google/callback/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function GET(request) {
  try {
    if (!JWT_SECRET || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("❌ Missing Google OAuth env vars");
      return NextResponse.redirect("/login?error=server_env");
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    if (!code || !returnedState) {
      return NextResponse.redirect("/login?error=google_state");
    }

    // ------------------------------------------------------------
    // Resolve origin safely
    // ------------------------------------------------------------
    const origin = (
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || `${url.protocol}//${url.host}`
    ).replace(/\/+$/, "");

    const redirectUri = (
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/google/callback`
    ).replace(/\/+$/, "");

    // ------------------------------------------------------------
    // CSRF validation via cookie
    // ------------------------------------------------------------
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_google")?.value || null;

    if (!storedState || storedState !== returnedState) {
      const bad = NextResponse.redirect("/login?error=google_state");
      bad.cookies.set("oauth_state_google", "", { path: "/", maxAge: 0 });
      return bad;
    }

    // ------------------------------------------------------------
    // Exchange authorization code for tokens
    // ------------------------------------------------------------
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
      console.error("❌ Google token exchange failed:", detail);
      return NextResponse.redirect("/login?error=google_token");
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect("/login?error=google_no_access_token");
    }

    // ------------------------------------------------------------
    // Fetch Google user profile
    // ------------------------------------------------------------
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userRes.ok) {
      return NextResponse.redirect("/login?error=google_userinfo");
    }

    const profile = await userRes.json();
    const email = profile?.email?.toLowerCase().trim();

    if (!email) {
      return NextResponse.redirect("/login?error=google_no_email");
    }

    // ------------------------------------------------------------
    // Find or create user
    // ------------------------------------------------------------
    await connectDB();

    let user = await User.findOne({ email });

    if (!user) {
      const [firstName = "", ...rest] = (profile.name || "").split(" ");
      const lastName = rest.join(" ");

      user = await User.create({
        firstName,
        lastName,
        username: email.split("@")[0],
        email,
        avatar: profile.picture || "",
        avatarType: "google",
        provider: "google",
        isVerified: true,
      });

      // Fire-and-forget welcome email
      try {
        await sendWelcomeEmail({ to: email });
      } catch (e) {
        console.warn("Welcome email failed (non-blocking):", e?.message || e);
      }
    }

    // ------------------------------------------------------------
    // Create session JWT
    // ------------------------------------------------------------
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ------------------------------------------------------------
    // Final redirect + cookie cleanup
    // ------------------------------------------------------------
    const res = NextResponse.redirect(`${origin}/dashboard`);

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("oauth_state_google", "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    console.error("❌ Google OAuth callback exception:", err);
    return NextResponse.redirect("/login?error=google_exception");
  }
}
