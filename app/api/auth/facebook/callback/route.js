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
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    // Compute origin + redirect_uri (env can override)
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || `${url.protocol}//${url.host}`;
    const redirectUri =
      process.env.FACEBOOK_REDIRECT_URI?.trim() ||
      `${origin}/api/auth/facebook/callback`;

    // Verify OAuth state (CSRF)
    const cookieStore = cookies(); // no await
    const storedState = cookieStore.get("oauth_state_facebook")?.value;
    if (!code || !returnedState || returnedState !== storedState) {
      return NextResponse.redirect(`${origin}/login?error=facebook_state`);
    }

    // (DB connect can happen later; token exchange first is fine too)
    await connectDB();

    // 1) Exchange code for access token
    // Keep API version consistent with your login route (use same vXX)
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_CLIENT_ID,
          client_secret: process.env.FACEBOOK_CLIENT_SECRET,
          redirect_uri: redirectUri, // MUST match what you sent in /api/auth/facebook
          code,
        },
      }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return NextResponse.redirect(`${origin}/login?error=facebook_no_token`);
    }

    // 2) Fetch profile
    const meRes = await axios.get(
      "https://graph.facebook.com/me?fields=id,name,email,picture",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const { email: emailRaw, name, id: facebookId, picture } = meRes.data || {};

    if (!emailRaw) {
      return NextResponse.redirect(`${origin}/login?error=facebook_no_email`);
    }

    const email = emailRaw.toLowerCase().trim();
    const [firstName = "", ...rest] = (name || "").split(" ");
    const lastName = rest.join(" ");
    const avatar =
      picture?.data?.url ||
      (facebookId
        ? `https://graph.facebook.com/${facebookId}/picture?type=large`
        : undefined);

    // 3) Upsert user
    let user = await User.findOne({ email });
    if (!user) {
      const username = email.split("@")[0];
      user = await User.create({
        firstName,
        lastName,
        username,
        email,
        facebookId,
        avatarType: "facebook",
        avatar,
        provider: "facebook",
        verified: true,
      });

      // Fire-and-forget welcome email
      try {
        await sendWelcomeEmail({ to: email });
      } catch {}
    }

    // 4) Issue your session JWT
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
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    res.cookies.delete("oauth_state_facebook");
    res.cookies.delete("post_auth_redirect");

    console.log(`✅ Facebook login successful: ${email}`);
    return res;
  } catch (err) {
    console.error(
      "Facebook OAuth callback error:",
      err?.response?.data || err.message || err
    );
    const origin =
      process.env.NEXT_PUBLIC_DOMAIN?.trim() || new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=facebook_exception`);
  }
}
