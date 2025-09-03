// app/api/auth/register/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendWelcomeAndVerifyEmail } from "@/lib/email/sendWelcomeAndVerifyEmail";
import { sanitizeUsername, isUsernameFormatValid } from "@/lib/identifiers";

const JWT_SECRET = process.env.JWT_SECRET || "";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(req) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: "Server misconfiguration." },
        { status: 500 }
      );
    }

    await connectDB();
    const payload = await req.json();

    const firstName = String(payload?.firstName ?? "").trim();
    const lastName = String(payload?.lastName ?? "").trim();
    const emailIn = String(payload?.email ?? "")
      .trim()
      .toLowerCase();
    const usernameIn = String(payload?.username ?? "").trim();
    const password = String(payload?.password ?? "");

    // Basic presence checks
    if (!emailIn || !usernameIn || !password) {
      return NextResponse.json(
        { error: "Email, username, and password are required." },
        { status: 400 }
      );
    }

    // Email format check (lightweight)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIn)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Server-side username rules (authoritative)
    // Validate the *raw* input with our helper (which sanitizes internally)
    if (!isUsernameFormatValid(usernameIn)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3–30 chars (a–z, 0–9, - or _), not reserved.",
        },
        { status: 400 }
      );
    }

    // Final username we will store (lowercase, URL-safe)
    const cleanUsername = sanitizeUsername(usernameIn);

    // Case-insensitive availability checks (robust even if legacy rows weren't normalized)
    const [emailExists, usernameExists] = await Promise.all([
      User.findOne({ email: new RegExp(`^${escapeRegex(emailIn)}$`, "i") })
        .select("_id")
        .lean(),
      User.findOne({
        username: new RegExp(`^${escapeRegex(cleanUsername)}$`, "i"),
      })
        .select("_id")
        .lean(),
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

    // Hash & create user
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      lastName,
      email: emailIn,
      username: cleanUsername,
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

    const base = (
      process.env.NEXT_PUBLIC_DOMAIN ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      ""
    ).replace(/\/+$/, "");
    const verifyUrl = `${base}/verify?token=${encodeURIComponent(token)}`;

    // Send welcome + verify email (best-effort)
    try {
      await sendWelcomeAndVerifyEmail({ toUser: user, verifyUrl });
    } catch (e) {
      // Don't block registration if email vendor hiccups
      console.warn("sendWelcomeAndVerifyEmail failed:", e?.message || e);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Registered. Please check your email to verify your account.",
      },
      { status: 201 }
    );
  } catch (err) {
    // Handle dup keys (race conditions)
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
