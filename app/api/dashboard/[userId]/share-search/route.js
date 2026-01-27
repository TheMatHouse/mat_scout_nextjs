export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";

function sid(v) {
  return v == null ? "" : String(v).trim();
}

function buildUserLabel(u) {
  const first = sid(u.firstName);
  const last = sid(u.lastName);
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (sid(u.name)) return sid(u.name);
  return sid(u.username);
}

export async function GET(req, ctx) {
  try {
    const p = await ctx.params;
    const userId = sid(p?.userId);
    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const q = sid(searchParams.get("q"));

    if (!q) return NextResponse.json([]);

    await connectDB();

    const regex = new RegExp(
      "^" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const users = await User.find({ username: { $regex: regex } })
      .select("_id username firstName lastName name email")
      .limit(10)
      .lean();

    const family = await FamilyMember.find({ username: { $regex: regex } })
      .select("_id username firstName lastName userId")
      .limit(10)
      .lean();

    const result = [
      ...users.map((u) => ({
        _id: u._id,
        username: u.username,
        label: buildUserLabel(u), // <-- Stephen Moore
        type: "user",
        email: u.email || null,
      })),
      ...family.map((f) => ({
        _id: f._id,
        username: f.username,
        label: `${sid(f.firstName)} ${sid(f.lastName)}`.trim() || f.username,
        type: "family",
        userId: f.userId,
      })),
    ];

    return NextResponse.json(result);
  } catch (err) {
    console.error("share-search error", err);
    return NextResponse.json({ message: "Search failed" }, { status: 500 });
  }
}
