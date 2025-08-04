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

    // ✅ Verify OAuth state to prevent CSRF attacks
    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_google")?.value;

    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=google`);
    }

    // ✅ 1. Exchange authorization code for access token
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
    if (!tokenData.access_token) {
      throw new Error("Failed to get Google access token");
    }

    const accessToken = tokenData.access_token;

    // ✅ 2. Fetch user info from Google API
    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const profile = await userRes.json();
    const { name, email, picture } = profile;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=google`);
    }

    await connectDB();

    // ✅ 3. Check if user exists, else create a new one
    let user = await User.findOne({ email });
    if (!user) {
      const firstName = name?.split(" ")[0] || "";
      const lastName = name?.split(" ")[1] || "";
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

      // Send welcome email (optional, non-verification)
      await sendWelcomeEmail({ to: email });
    }

    // ✅ 4. Create JWT token for session
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false }, // ✅ add isAdmin
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ 5. Set secure HttpOnly cookie
    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // ✅ 6. Clear OAuth state cookie
    response.cookies.delete("oauth_state_google");

    console.log(`✅ Google login successful: ${user.email}`);

    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err.message);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google`);
  }
}
