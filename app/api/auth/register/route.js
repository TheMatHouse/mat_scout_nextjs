// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeAndVerifyEmail } from "@/lib/email/sendWelcomeAndVerifyEmail";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();
    const { firstName, lastName, email, username, password } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { message: "Email, username, and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { message: "Email already in use." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName || "",
      lastName: lastName || "",
      email: normalizedEmail,
      username: username.toLowerCase().trim(),
      password: hashed,
      provider: "local",
      verified: false,
    });

    // Create a verification token (24h)
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const verifyUrl = `${
      process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL
    }/verify?token=${encodeURIComponent(token)}`;

    // Always send Welcome + Verify
    await sendWelcomeAndVerifyEmail({ toUser: user, verifyUrl });

    // You can choose to not log in the user until verified:
    return NextResponse.json(
      {
        message: "Registered. Please check your email to verify your account.",
      },
      { status: 201 }
    );

    // If you want to auto-login instead, tell me and I’ll return a JWT cookie like your OAuth flows.
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
