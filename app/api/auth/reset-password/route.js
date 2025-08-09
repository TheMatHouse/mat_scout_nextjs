// app/api/auth/reset-password/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as Cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { token, email, password } = await req.json();

    if (
      !token ||
      typeof token !== "string" ||
      !email ||
      typeof email !== "string" ||
      !password ||
      typeof password !== "string"
    ) {
      return NextResponse.json(
        { message: "Missing token, email, or password" },
        { status: 400 }
      );
    }

    // (Optional) basic guard; keep or replace with your own password policy
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalized = email.toLowerCase().trim();
    const user = await User.findOne({
      email: normalized,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // Hash and save new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    if (typeof user.tempPassword === "boolean") {
      user.tempPassword = false;
    }
    user.updatedAt = new Date();
    await user.save();

    // Create a fresh session JWT
    const jwtToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      message: "Password reset successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
      },
    });

    // Set session cookie
    const serialized = Cookie.serialize("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.headers.set("Set-Cookie", serialized);
    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
