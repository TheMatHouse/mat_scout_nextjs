// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();
    const { firstName, lastName, username, email, password } = await req.json();

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email or username already in use" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = jwt.sign({ _id: newUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = NextResponse.json({
      message: "Registration successful",
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
      },
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
