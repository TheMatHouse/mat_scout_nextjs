import { NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/mongo";
import { validateUsername } from "@/lib/validateUsername";
import { signToken } from "@/lib/jwt";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code)
    return NextResponse.json({ error: "Missing Google code" }, { status: 400 });

  const redirectUri =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000/api/auth/google/callback"
      : "https://ssm-testing.com/api/auth/google/callback";

  try {
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

    const firstName = given_name || name?.split(" ")[0] || "User";
    const lastName =
      family_name || name?.split(" ").slice(1).join(" ") || "User";

    let tempUsername = (firstName + lastName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const username = await validateUsername(tempUsername);

    const avatar = picture;
    const googleAvatar = picture;

    const { default: UserModel } = await import("@/models/userModel.js");
    let user = await UserModel.findOne({ email });

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
        avatarType: "google",
        provider: "google",
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
    console.error("Google OAuth error:", error.message);
    return NextResponse.json({ error: "Google login failed" }, { status: 500 });
  }
}
