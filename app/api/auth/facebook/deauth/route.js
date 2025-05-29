import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import jwt from "jsonwebtoken";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      "https://matscout.com/login?error=missing_code"
    );
  }

  const redirectUri = "https://matscout.com/api/auth/facebook/callback";

  try {
    // Exchange code for access token
    const tokenRes = await axios.get(
      `https://graph.facebook.com/v22.0/oauth/access_token`,
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

    // Get user profile
    const userRes = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: "id,name,email,picture",
        access_token: accessToken,
      },
    });

    const { id: facebookId, name, email } = userRes.data;

    await connectDB();

    let user = await User.findOne({ facebookId });

    if (!user) {
      user = await User.create({
        facebookId,
        name,
        email,
      });
    }

    // Create a JWT session
    const token = jwt.sign(
      { _id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.redirect("https://matscout.com/dashboard");
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "Lax",
    });

    return response;
  } catch (err) {
    console.error("Facebook login error:", err.response?.data || err.message);
    return NextResponse.redirect(
      "https://matscout.com/login?error=facebook_login_failed"
    );
  }
}
