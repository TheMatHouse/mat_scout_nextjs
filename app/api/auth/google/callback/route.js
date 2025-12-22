// app/api/auth/google/callback/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect("/login?error=google_state");
    }

    // 🔐 Decode and validate state
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    } catch {
      return NextResponse.redirect("/login?error=google_state");
    }

    // Optional: state freshness check (5 min)
    if (Date.now() - decoded.t > 5 * 60 * 1000) {
      return NextResponse.redirect("/login?error=google_state_expired");
    }

    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.replace(/\/+$/, "") ||
      `${url.protocol}//${url.host}`;

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI?.replace(/\/+$/, "") ||
      `${origin}/api/auth/google/callback`;

    // Exchange code
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect("/login?error=google_token");
    }

    const tokenData = await tokenRes.json();

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
    const email = profile.email?.toLowerCase();

    if (!email) {
      return NextResponse.redirect("/login?error=google_no_email");
    }

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
        avatar: profile.picture,
        avatarType: "google",
        provider: "google",
        isVerified: true,
      });

      try {
        await sendWelcomeEmail({ to: email });
      } catch {}
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const res = NextResponse.redirect(`${origin}/dashboard`);
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect("/login?error=google_exception");
  }
}
