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
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;

    // Verify OAuth state (CSRF)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_google")?.value;
    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=google`);
    }

    // 1) Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${origin}/api/auth/google/callback`,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token)
      throw new Error("Failed to get Google access token");
    const accessToken = tokenData.access_token;

    // 2) Get profile
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const profile = await userRes.json();
    const emailRaw = profile?.email;
    if (!emailRaw) {
      return NextResponse.redirect(`${origin}/login?error=google`);
    }
    const email = emailRaw.toLowerCase().trim();
    const name = profile?.name || "";
    const picture = profile?.picture;

    await connectDB();

    // 3) Find or create
    let user = await User.findOne({ email });
    if (!user) {
      const [firstName = "", lastName = ""] = name.split(" ");
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
        verified: true, // OAuth users are considered verified
      });

      // Welcome email (non-transactional by default; respects prefs/dedupe)
      await sendWelcomeEmail({ toUser: user });
      // If you want it to always send, switch Mail.kinds in sendWelcomeEmail as discussed.
    }

    // 4) Session JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5) Cookie
    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // 6) Clear state cookie
    response.cookies.delete("oauth_state_google");

    console.log(`✅ Google login successful: ${email}`);
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err.message || err);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google`);
  }
}
