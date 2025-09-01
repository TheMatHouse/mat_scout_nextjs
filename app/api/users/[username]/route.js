// app/api/users/[username]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import User from "@/models/userModel";
// Side-effect imports to register refs used by populate:
import "@/models/userStyleModel";
import "@/models/matchReportModel";

function sanitizeUser(doc) {
  if (!doc) return null;
  const u = { ...doc };
  delete u.password;
  delete u.resetToken;
  delete u.resetTokenExpiry;
  delete u.verificationToken;
  delete u.verificationTokenExpiry;
  return u;
}

export async function GET(_req, { params }) {
  try {
    await connectDB();

    const { username } = await params;

    // Find user and populate referenced docs safely
    const found = await User.findOne({ username })
      .populate("userStyles")
      .populate("matchReports")
      .lean();

    if (!found) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const me = await getCurrentUser().catch(() => null);
    const isOwner = !!me?._id && String(me._id) === String(found._id);

    // Respect privacy: if not owner and not public, don't 404—return a private marker
    if (!isOwner && !found.allowPublic) {
      return NextResponse.json(
        {
          private: true,
          username: found.username,
          displayName:
            [found.firstName, found.lastName].filter(Boolean).join(" ") ||
            found.username,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { user: sanitizeUser(found) },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (err) {
    console.error("GET /api/users/[username] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
