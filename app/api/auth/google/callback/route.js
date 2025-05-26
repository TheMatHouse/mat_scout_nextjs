import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { validateUsername } from "@/lib/validateUsername";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  console.log("👉 Google callback hit");
  console.log("👉 Code from URL:", code);

  if (!code) {
    return NextResponse.json({ error: "Missing Google code" }, { status: 400 });
  }

  const redirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/api/auth/google/callback"
      : "https://ssm-testing.com/api/auth/google/callback";

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    console.log("✅ Access token received:", accessToken);

    // Fetch user profile
    const profileRes = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const { id, name, given_name, family_name, email, picture } =
      profileRes.data;
    console.log("✅ Google profile:", profileRes.data);

    const firstName = given_name || name?.split(" ")[0] || "User";
    const lastName =
      family_name || name?.split(" ").slice(1).join(" ") || "User";

    let tempUsername = (firstName + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const username = await validateUsername(tempUsername);

    const avatar = picture;
    const googleAvatar = picture;
    const avatarType = "google";

    await connectDB();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        googleId: id,
        username,
        firstName,
        lastName,
        avatar,
        googleAvatar,
        avatarType,
      });
    }

    console.log("🎉 Google login successful");
    return NextResponse.json({
      message: "Google login successful",
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
    console.error("❌ Google OAuth error:");
    console.error("Message:", error.message);
    console.error("Response Data:", error?.response?.data);
    return NextResponse.json({ error: "Google login failed" }, { status: 500 });
  }
}
