// app/api/auth/check-username/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import {
  sanitizeUsername,
  USERNAME_REGEX,
  RESERVED_USERNAMES,
} from "@/lib/identifiers";

export async function GET(request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("username") ?? "";

  // Normalize/sanitize early (this also strips '.' and '@')
  const username = sanitizeUsername(raw);

  // Basic format checks
  if (!username) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        message: "Username is required.",
      },
      { status: 200 }
    );
  }
  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        message:
          "Use 3–30 chars: lowercase letters, numbers, hyphen or underscore; must start/end with a letter or number.",
      },
      { status: 200 }
    );
  }
  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        message: "This username is reserved. Please choose another.",
      },
      { status: 200 }
    );
  }

  try {
    await connectDB();

    // Case-insensitive uniqueness check
    const exists = await User.findOne({
      username: { $regex: `^${username}$`, $options: "i" },
    }).lean();

    return NextResponse.json(
      {
        available: !exists,
        valid: true,
        message: !exists ? "Available" : "Username is already taken.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error checking username:", err);
    return NextResponse.json(
      { available: false, valid: false, message: "Server error" },
      { status: 500 }
    );
  }
}
