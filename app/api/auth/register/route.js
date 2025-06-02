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

    const { firstName, lastName, username, email, password } = await req.json();

    if (!firstName || !lastName || !username || !email || !password) {
      return errorResponse("All fields are required", 400);
    }

    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    // Check username/email uniqueness
    if (await User.findOne({ username: normalizedUsername })) {
      return errorResponse("Username is taken", 409);
    }
    if (await User.findOne({ email: normalizedEmail })) {
      return errorResponse("Email is registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: "USER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

    // Sign JWT token
    const token = jwt.sign({ _id: newUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const response = NextResponse.json({ message: "Registration successful" });

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
    console.error("Registration error:", err);
    return errorResponse("Internal Server Error", 500);
  }
}
