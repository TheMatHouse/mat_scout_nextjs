import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/mongo";
import { User } from "@/models/userModel";
import { validateUsername } from "@/lib/validateUsername";
import { signToken } from "@/lib/jwt";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("👉 Facebook callback hit");
  if (!code)
    return NextResponse.json(
      { error: "Missing Facebook code" },
      { status: 400 }
    );

  const redirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/api/auth/facebook/callback"
      : "https://ssm-testing.com/api/auth/facebook/callback";

  try {
    // Exchange code for access token
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v22.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
          code,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // Fetch user profile
    const profileRes = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });

    const { id, name, email } = profileRes.data;

    const honorifics = [
      "jr",
      "sr",
      "ii",
      "iii",
      "iv",
      "v",
      "ply",
      "phd",
      "md",
      "esq",
      "mba",
    ];
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "User";

    let lastName = "";
    for (let i = 1; i < nameParts.length; i++) {
      if (!honorifics.includes(nameParts[i].toLowerCase())) {
        lastName = nameParts[i];
        break;
      }
    }
    if (!lastName) lastName = "user";

    let tempUsername = (firstName + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const username = await validateUsername(tempUsername);

    const avatar = `https://graph.facebook.com/${id}/picture?type=large`;

    await connectDB();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId: id,
        username,
        firstName,
        lastName,
        avatar,
        facebookAvatar: avatar,
        avatarType: "facebook",
      });
    }

    const jwt = signToken({ userId: user._id });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

    response.cookies.set("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Facebook OAuth error:", error.message);
    return NextResponse.json(
      { error: "Facebook login failed" },
      { status: 500 }
    );
  }
}
