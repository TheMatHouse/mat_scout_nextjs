// app/api/teams/mine/count/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import mongoose from "mongoose";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export async function GET(req) {
  try {
    await connectDB();

    const me = await getCurrentUser();
    if (!me?._id) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const sid = String(me._id);
    const oid = mongoose.Types.ObjectId.isValid(sid)
      ? new mongoose.Types.ObjectId(sid)
      : null;

    // --- 1) Owned Teams (Team.user = you) ---
    const ownedIds = await Team.find(
      oid ? { $or: [{ user: oid }, { user: sid }] } : { user: sid }
    ).distinct("_id");

    // --- 2) Member Teams (TeamMember.user = you) ---
    // Adjust field names here if needed (teamId or team)
    const memberAgg = await TeamMember.aggregate([
      {
        $match: oid ? { $or: [{ user: oid }, { user: sid }] } : { user: sid },
      },
      {
        $addFields: {
          teamKey: { $ifNull: ["$team", "$teamId"] },
        },
      },
      { $match: { teamKey: { $ne: null } } },
      { $group: { _id: "$teamKey" } },
    ]);

    const memberIds = memberAgg.map((m) => String(m._id));
    const allIds = new Set([...ownedIds.map((id) => String(id)), ...memberIds]);

    // Optional debug mode
    const { searchParams } = new URL(req.url);
    if (searchParams.get("debug")) {
      return NextResponse.json(
        {
          user: { id: sid },
          ownedCount: ownedIds.length,
          memberCount: memberIds.length,
          totalUnique: allIds.size,
          ownedIds,
          memberIds,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ count: allIds.size }, { status: 200 });
  } catch (err) {
    console.error("GET /api/teams/mine/count error:", err);
    return NextResponse.json(
      { count: 0, error: "server_error" },
      { status: 500 }
    );
  }
}
