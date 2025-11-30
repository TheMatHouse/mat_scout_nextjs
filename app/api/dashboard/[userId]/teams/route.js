// app/api/dashboard/[userId]/teams/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(_request, context) {
  try {
    const { params } = context;
    const { userId } = await params;

    await connectDB();

    const viewer = await getCurrentUser();
    if (!viewer) {
      // Keep your encryption-branch behavior:
      return NextResponse.json([], { status: 401 });
    }

    if (String(viewer._id) !== String(userId)) {
      // Keep your encryption-branch behavior:
      return NextResponse.json([], { status: 403 });
    }

    // --- TEAMS WHERE USER IS MEMBER
    const memberLinks = await TeamMember.find({
      $or: [{ userId: userId }, { familyMemberId: userId }],
    }).lean();

    const memberTeamIds = memberLinks.map((m) => m.teamId).filter(Boolean);

    const memberTeams =
      memberTeamIds.length > 0
        ? await Team.find({ _id: { $in: memberTeamIds } })
            .select("teamName teamSlug logoURL security")
            .lean()
        : [];

    // --- TEAMS WHERE USER IS OWNER
    const ownerTeams = await Team.find({ user: userId })
      .select("teamName teamSlug logoURL security")
      .lean();

    // --- MERGE UNIQUE
    const map = new Map();

    for (const t of memberTeams) map.set(String(t._id), t);

    for (const t of ownerTeams) {
      const id = String(t._id);
      if (!map.has(id)) map.set(id, t);
    }

    const teamsArray = Array.from(map.values());

    // --- ADD SCOUTING REPORT COUNTS
    const enriched = await Promise.all(
      teamsArray.map(async (team) => {
        const count = await TeamScoutingReport.countDocuments({
          teamId: team._id,
        });
        return { ...team, scoutingReportsCount: count };
      })
    );

    // IMPORTANT: Return ONLY the ARRAY for this branch
    return NextResponse.json(enriched, { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/dashboard/[userId]/teams:", err);

    // Keep your encryption-branch behavior:
    return NextResponse.json([], { status: 500 });
  }
}
