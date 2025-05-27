// app/api/auth/register/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/jwt";
import { validateUsername } from "@/lib/validateUsername";

export async function POST(req) {
  try {
    await connectDB();

    const { email, password, firstName, lastName } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate a unique username
    const rawUsername = `${firstName}${lastName}`
      .toLowerCase()
      .replace(/\s+/g, "");
    const username = await validateUsername(rawUsername);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      username,
      avatarType: "default",
      provider: "credentials",
    });

    const token = signToken({ userId: newUser._id });

    // ✅ Set the token cookie
    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({
      message: "Registration successful",
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
