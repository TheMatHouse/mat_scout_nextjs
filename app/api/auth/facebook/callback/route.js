// app/api/facebook/callback/route.js
import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code) {
    return NextResponse.json(
      { error: "Missing Facebook code" },
      { status: 400 }
    );
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.get(
      `https://graph.facebook.com/v22.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: "https://ssm-testing.com/api/auth/facebook/callback",
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // 2. Get user profile from Facebook
    const profileRes = await axios.get(`https://graph.facebook.com/me`, {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });

    const { id, name, email } = profileRes.data;

    // 3. Connect to DB
    await connectDB();

    // 4. Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId: id,
        // Optional: generate username, avatar, etc.
      });
    }

    // 5. You can now return a JWT, redirect, or start a session
    return NextResponse.json({
      message: "Facebook login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Facebook OAuth error:");
    console.error("Message:", error.message);
    console.error("Response Data:", error?.response?.data);
    console.error("Full Error:", error);

    return NextResponse.json(
      { error: "Facebook login failed" },
      { status: 500 }
    );
  }
}
