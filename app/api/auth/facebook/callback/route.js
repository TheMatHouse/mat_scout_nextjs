import axios from "axios";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

export const runtime = "nodejs"; // Ensure this runs in node runtime

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const origin = new URL(request.url).origin;

    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_facebook")?.value;

    if (!code || !state || !storedState || state !== storedState) {
      console.error("Invalid OAuth state");
      return NextResponse.redirect(`${origin}/login?error=invalid_state`);
    }

    const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

    // Exchange code for access token
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

    // Get user info
    const userRes = await axios.get(
      "https://graph.facebook.com/me?fields=id,name,email,picture",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { email, name, id: facebookId } = userRes.data;

    if (!email) {
      console.error("Missing email from Facebook response");
      return NextResponse.redirect(`${origin}/login?error=missing_email`);
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId,
        avatarType: "facebook",
        avatar: `https://graph.facebook.com/${facebookId}/picture?type=large`,
        provider: "facebook",
        verified: true,
      });

      // Send welcome email (non-verification)
      await sendWelcomeEmail({ to: email });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    response.cookies.set("oauth_state_facebook", "", {
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Facebook OAuth callback error:", err?.response?.data || err);
    return NextResponse.redirect(
      `${new URL(request.url).origin}/login?error=facebook`
    );
  }
}
