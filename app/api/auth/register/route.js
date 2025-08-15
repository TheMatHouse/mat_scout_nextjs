// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeAndVerifyEmail } from "@/lib/email/sendWelcomeAndVerifyEmail";
import { sanitizeUsername, isUsernameFormatValid } from "@/lib/identifiers";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    await connectDB();
    const { firstName, lastName, email, username, password } = await req.json();

    // Basic presence checks
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, username, and password are required." },
        { status: 400 }
      );
    }

    // Normalize inputs
    const normalizedEmail = String(email).toLowerCase().trim();
    const cleanUsername = sanitizeUsername(username);

    // Server-side username format validation (authoritative)
    if (!isUsernameFormatValid(cleanUsername)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–30 chars (a–z, 0–9, - or _), not reserved.",
        },
        { status: 400 }
      );
    }

    // Availability checks (authoritative)
    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: normalizedEmail }).select("_id").lean(),
      User.findOne({ username: cleanUsername }).select("_id").lean(),
    ]);
    if (emailExists) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 }
      );
    }
    if (usernameExists) {
      return NextResponse.json(
        { error: "Username already taken." },
        { status: 409 }
      );
    }

    // Create user
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName: firstName?.trim() || "",
      lastName: lastName?.trim() || "",
      email: normalizedEmail,
      username: cleanUsername, // schema lowercases & trims as well
      password: hashed,
      provider: "local",
      verified: false,
    });

    // Email verification token (24h)
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const base =
      process.env.NEXT_PUBLIC_DOMAIN || process.env.NEXT_PUBLIC_BASE_URL || "";
    const verifyUrl = `${base}/verify?token=${encodeURIComponent(token)}`;

    // Send welcome + verify email
    await sendWelcomeAndVerifyEmail({ toUser: user, verifyUrl });

    // Success (don’t auto-login until verified)
    return NextResponse.json(
      {
        ok: true,
        message: "Registered. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (err) {
    // Graceful duplicate handling (in case of race)
    if (err?.code === 11000 && err?.keyPattern) {
      if (err.keyPattern.email) {
        return NextResponse.json(
          { error: "Email already in use." },
          { status: 409 }
        );
      }
      if (err.keyPattern.username) {
        return NextResponse.json(
          { error: "Username already taken." },
          { status: 409 }
        );
      }
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
