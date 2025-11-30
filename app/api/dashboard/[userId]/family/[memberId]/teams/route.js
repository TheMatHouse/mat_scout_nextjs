// app/api/dashboard/[userId]/family/[memberId]/teams/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export async function GET(_req, ctx) {
  try {
    const { userId, memberId } = await ctx.params;

    await connectDB();

    const viewer = await getCurrentUser();
    if (!viewer)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Parent must match userId in URL
    if (String(viewer._id) !== String(userId))
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // Get all TeamMember rows where this child is the familyMemberId
    const links = await TeamMember.find({
      familyMemberId: memberId,
    }).lean();

    const teamIds = links.map((m) => m.teamId).filter(Boolean);

    const teams = teamIds.length
      ? await Team.find({ _id: { $in: teamIds } })
          .select("teamName teamSlug logoURL security")
          .lean()
      : [];

    return NextResponse.json({ teams }, { status: 200 });
  } catch (err) {
    console.error("Error loading family member teams:", err);
    return NextResponse.json(
      { message: "Failed to load teams" },
      { status: 500 }
    );
  }
}
