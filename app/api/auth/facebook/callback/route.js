import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/lib/mongo";
import { validateUsername } from "@/lib/validateUsername";
import { signToken } from "@/lib/jwt";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing Facebook code" },
      { status: 400 }
    );
  }

  const redirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/api/auth/facebook/callback"
      : process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;

  try {
    // Step 1: Get access token from Facebook
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

    // Step 2: Get profile info from Facebook
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

    // Step 3: Connect to DB and create/find user
    const { default: UserModel } = await import("@/models/userModel.js");
    let user = await UserModel.findOne({ email });

    if (!user) {
      user = await UserModel.create({
        name,
        email,
        facebookId: id,
        username,
        firstName,
        lastName,
        avatar,
        facebookAvatar: avatar,
        avatarType: "facebook",
        provider: "facebook",
        gender: "not specified",
      });
    }

    // Step 4: Sign JWT token
    const jwt = signToken({ id: user._id });

    const baseURL =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://matscout.com";

    // Step 5: Set cookie and redirect
    const response = NextResponse.redirect(`${baseURL}/dashboard`);

    response.cookies.set("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    console.log("🔐 Facebook JWT:", jwt);
    console.log("✅ Setting token cookie and redirecting...");
    return response;
  } catch (error) {
    console.error("Facebook OAuth error:", error.message);
    return NextResponse.json(
      { error: "Facebook login failed" },
      { status: 500 }
    );
  }
}
