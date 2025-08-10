// app/api/auth/facebook/callback/route.js
import axios from "axios";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;

    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_facebook")?.value;

    // Validate OAuth state
    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=invalid_state`);
    }

    await connectDB();

    const redirectUri = `${origin}/api/auth/facebook/callback`;

    // 1) Exchange code for access token
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_CLIENT_ID,
          client_secret: process.env.FACEBOOK_CLIENT_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      }
    );
    const accessToken = tokenRes.data.access_token;

    // 2) Get user info
    const userRes = await axios.get(
      "https://graph.facebook.com/me?fields=id,name,email,picture",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const {
      email: emailRaw,
      name,
      id: facebookId,
      picture,
    } = userRes.data || {};
    if (!emailRaw) {
      return NextResponse.redirect(`${origin}/login?error=missing_email`);
    }
    const email = emailRaw.toLowerCase().trim();

    // 3) Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      const [firstName = "", lastName = ""] = (name || "").split(" ");
      const username = email.split("@")[0];

      user = await User.create({
        firstName,
        lastName,
        username,
        email,
        facebookId,
        avatarType: "facebook",
        avatar:
          picture?.data?.url ||
          `https://graph.facebook.com/${facebookId}/picture?type=large`,
        provider: "facebook",
        verified: true,
      });

      // Send welcome email (simple version accepts { to })
      await sendWelcomeEmail({ to: email });
    }

    // 4) Session JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5) Determine redirect from cookie
    const postRedirect = cookieStore.get("post_auth_redirect")?.value;
    const safeRedirect =
      postRedirect && postRedirect.startsWith("/")
        ? postRedirect
        : "/dashboard";
    const target = `${origin}${safeRedirect}`;

    const response = NextResponse.redirect(target);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Clear helper cookies
    response.cookies.delete("oauth_state_facebook");
    response.cookies.delete("post_auth_redirect");

    console.log(`✅ Facebook login successful: ${email}`);
    return response;
  } catch (err) {
    console.error(
      "Facebook OAuth callback error:",
      err?.response?.data || err.message || err
    );
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=facebook`);
  }
}
