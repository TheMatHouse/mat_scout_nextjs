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

    if (!token || !email || !password) {
      return NextResponse.json(
        { message: "Missing token, email, or password" },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    const jwtToken = jwt.sign({ _id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = NextResponse.json({
      message: "Password reset successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
      },
    });

    const serialized = Cookie.serialize("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
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
