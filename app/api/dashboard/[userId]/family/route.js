// app/api/dashboard/[userId]/family/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
import FamilyMember from "@/models/familyMemberModel";

const isValidId = (id) => !!id && Types.ObjectId.isValid(id);

// GET /api/dashboard/:userId/family  -> list of members with avatar fields
export async function GET(_req, { params }) {
  await connectDB();

  const { userId } = await params;
  if (!isValidId(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const currentUser = await getCurrentUserFromCookies();
  if (!currentUser || String(currentUser._id) !== String(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Return the fields FamilyCard needs (include avatar fields!)
    const members = await FamilyMember.find(
      { userId: currentUser._id },
      {
        firstName: 1,
        lastName: 1,
        username: 1,
        gender: 1,
        // 👇 important for the card image
        avatar: 1,
        avatarId: 1,
        avatarType: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1, _id: -1 })
      .lean();

    // Normalize ids to strings for client
    const rows = (members || []).map((m) => ({
      ...m,
      _id: String(m._id),
      userId: String(currentUser._id),
    }));

    return NextResponse.json({ ok: true, rows }, { status: 200 });
  } catch (err) {
    console.error("GET family list error:", err);
    return NextResponse.json(
      { error: "Failed to fetch family members" },
      { status: 500 }
    );
  }
}
