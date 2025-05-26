import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { validateUsername } from "@/lib/validateUsername";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("👉 Facebook callback hit");
  console.log("👉 Code from URL:", code);
  console.log("👉 State from URL:", state);

  if (!code) {
    console.log("❌ No code found in query.");
    return NextResponse.json(
      { error: "Missing Facebook code" },
      { status: 400 }
    );
  }

  const redirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/api/auth/facebook/callback"
      : "https://ssm-testing.com/api/auth/facebook/callback";

  try {
    console.log("🌐 Requesting access token from Facebook...");

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
    console.log("✅ Access token received:", accessToken);

    console.log("🌐 Fetching user profile from Facebook...");
    const profileRes = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email",
        access_token: accessToken,
      },
    });

    const { id, name, email } = profileRes.data;
    console.log("✅ Facebook profile:", { id, name, email });

    // === Name Parsing and Username Logic ===
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

    const fullName = name || "";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "User";

    let lastName = "";
    for (let i = 1; i < nameParts.length; i++) {
      const part = nameParts[i].toLowerCase();
      if (!honorifics.includes(part)) {
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

    console.log("🔌 Connecting to MongoDB...");
    await connectDB();

    console.log("🔍 Searching for existing user...");
    let user = await User.findOne({ email });

    if (!user) {
      console.log("👤 Creating new user...");
      user = await User.create({
        name: fullName,
        email,
        facebookId: id,
        username,
        firstName,
        lastName,
        avatar,
        facebookAvatar: avatar,
        avatarType: "facebook",
      });
    } else {
      console.log("✅ Existing user found:", user._id);
    }

    console.log("🎉 Facebook login successful");
    return NextResponse.json({
      message: "Facebook login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        avatarType: user.avatarType,
      },
    });
  } catch (error) {
    console.error("❌ Facebook OAuth error:");
    console.error("Message:", error.message);
    console.error("Response Data:", error?.response?.data);
    console.error("Full Error:", error);

    return NextResponse.json(
      { error: "Facebook login failed" },
      { status: 500 }
    );
  }
}
