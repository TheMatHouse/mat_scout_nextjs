// app/api/auth/verify/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();

    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Prefer sub (user id) if present; fall back to email
    const query = decoded.sub
      ? { _id: decoded.sub }
      : decoded.email
      ? { email: decoded.email.toLowerCase().trim() }
      : null;

    if (!query) {
      return NextResponse.json(
        { error: "Token missing subject/email" },
        { status: 400 }
      );
    }

    const user = await User.findOne(query);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.verified) {
      return NextResponse.json(
        { message: "Already verified" },
        { status: 200 }
      );
    }

    user.verified = true;
    user.verificationToken = null; // harmless if you aren’t using DB tokens
    await user.save();

    return NextResponse.json({ message: "Email verified!" }, { status: 200 });
  } catch (err) {
    console.error("Error verifying email:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
