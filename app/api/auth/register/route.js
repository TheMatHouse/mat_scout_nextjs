import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/mongo";
import User from "@/models/userModel";
import { signToken } from "@/lib/jwt";

export async function POST(req) {
  await connectDB();
  const { firstName, lastName, email, username, password } = await req.json();

  if (!email || !password || !username || !firstName || !lastName) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return NextResponse.json(
      { message: "User already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    username,
    password: hashedPassword,
    verified: true,
  });

  const token = signToken({ id: user._id });

  return NextResponse.json({
    token,
    user: { id: user._id, username: user.username },
  });
}
