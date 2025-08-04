import axios from "axios";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";
import { sendWelcomeEmail } from "@/lib/email/sendWelcomeEmail";

const JWT_SECRET = process.env.JWT_SECRET;

export const runtime = "nodejs"; // Ensure server runtime

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const returnedState = searchParams.get("state");
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;

    const cookieStore = await cookies();
    const storedState = cookieStore.get("oauth_state_facebook")?.value;

    // ✅ Validate OAuth state
    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=invalid_state`);
    }

    await connectDB();

    const redirectUri = `${origin}/api/auth/facebook/callback`;

    // ✅ Exchange code for access token
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

    // ✅ Get user info from Facebook
    const userRes = await axios.get(
      "https://graph.facebook.com/me?fields=id,name,email,picture",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { email, name, id: facebookId, picture } = userRes.data;
    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=missing_email`);
    }

    // ✅ Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      const firstName = name?.split(" ")[0] || "";
      const lastName = name?.split(" ")[1] || "";

      user = await User.create({
        firstName,
        lastName,
        username: email.split("@")[0],
        email,
        facebookId,
        avatarType: "facebook",
        avatar: `https://graph.facebook.com/${facebookId}/picture?type=large`,
        provider: "facebook",
        verified: true,
      });

      // Optional: Send welcome email
      await sendWelcomeEmail({ to: email });
    }

    // ✅ Create JWT and set cookie
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin || false }, // ✅ add isAdmin
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.redirect(`${origin}/dashboard`);
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // ✅ Remove OAuth state cookie
    response.cookies.delete("oauth_state_facebook");

    console.log(`✅ Facebook login successful: ${user.email}`);

    return response;
  } catch (err) {
    console.error(
      "Facebook OAuth callback error:",
      err?.response?.data || err.message
    );
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=facebook`);
  }
}
