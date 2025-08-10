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

    // 1) Exchange authorization code for access token
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
      return NextResponse.redirect(`${origin}/login?error=google`);
    }
    const email = emailRaw.toLowerCase().trim();
    const name = profile?.name || "";
    const picture = profile?.picture;

    await connectDB();

    // 3) Find or create user
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
        verified: true,
      });

      // Send welcome email (simple version accepts { to })
      await sendWelcomeEmail({ to: email });
    }

    // 4) Create session JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5) Figure out post-auth redirect
    const postRedirect = cookieStore.get("post_auth_redirect")?.value; // e.g. /accept-invite?token=...
    const safeRedirect =
      postRedirect && postRedirect.startsWith("/")
        ? postRedirect
        : "/dashboard";
    const target = `${origin}${safeRedirect}`;

    // 6) Build response with cookie + cleanup
    const response = NextResponse.redirect(target);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Clear helper cookies
    response.cookies.delete("oauth_state_google");
    response.cookies.delete("post_auth_redirect");

    console.log(`✅ Google login successful: ${email}`);
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err?.message || err);
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=google`);
  }
}
