import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "@/models/userModel";
import { connectDB } from "@/lib/mongo";

const JWT_SECRET = process.env.JWT_SECRET;

function errorResponse(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    if (!email || !password) {
      return errorResponse("Missing email or password", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse("Invalid credentials", 401);
    }

    const token = jwt.sign({ _id: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse("Internal Server Error", 500);
  }
}
