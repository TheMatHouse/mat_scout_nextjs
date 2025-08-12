// app/api/auth/check-email/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";

function escapeRegex(str = "") {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const emailRaw = (searchParams.get("email") || "").trim();

    if (!emailRaw) {
      return NextResponse.json(
        { available: false, message: "Email required" },
        { status: 400 }
      );
    }

    // Case-insensitive exact match
    const re = new RegExp(`^${escapeRegex(emailRaw)}$`, "i");
    const exists = await User.exists({ email: re }).lean();

    return NextResponse.json({ available: !exists });
  } catch (err) {
    console.error("check-email failed:", err);
    return NextResponse.json(
      { available: false, message: "Server error" },
      { status: 500 }
    );
  }
}
