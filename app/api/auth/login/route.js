import { NextResponse } from "next/server";
import { signToken } from "@/lib/jwt";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";

export async function POST(req) {
  await connectDB();

  const { email, password } = await req.json();
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const jwt = signToken({ userId: user._id });

  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_DOMAIN}/dashboard`
  );

  response.cookies.set("token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  console.log("✅ Login success, token set.");
  return response;
}
