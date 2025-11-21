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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Only allow a user to load THEIR teams
    if (String(viewer._id) !== String(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    /* ------------------------------------------------------------------
       1) TEAMS WHERE USER IS A MEMBER (TeamMember rows)
    ------------------------------------------------------------------ */
    const memberLinks = await TeamMember.find({
      $or: [{ userId: userId }, { familyMemberId: userId }],
    }).lean();

    const memberTeamIds = memberLinks.map((m) => m.teamId).filter(Boolean);

    const memberTeams = memberTeamIds.length
      ? await Team.find({ _id: { $in: memberTeamIds } })
          .select("teamName teamSlug logoURL security")
          .lean()
      : [];

    /* ------------------------------------------------------------------
       2) TEAMS WHERE USER IS THE OWNER
    ------------------------------------------------------------------ */
    const ownerTeams = await Team.find({ user: userId })
      .select("teamName teamSlug logoURL security")
      .lean();

    /* ------------------------------------------------------------------
       3) MERGE TEAMS WITHOUT DUPLICATES
    ------------------------------------------------------------------ */
    const map = new Map();

    for (const t of memberTeams) {
      map.set(String(t._id), t);
    }

    for (const t of ownerTeams) {
      const id = String(t._id);
      if (!map.has(id)) {
        map.set(id, t);
      }
    }

    const teamsArray = Array.from(map.values());

    /* ------------------------------------------------------------------
       4) COUNT SCOUTING REPORTS PER TEAM
    ------------------------------------------------------------------ */
    const teamsWithCounts = await Promise.all(
      teamsArray.map(async (team) => {
        const count = await TeamScoutingReport.countDocuments({
          teamId: team._id,
        });

        return {
          ...team,
          scoutingReportsCount: count,
        };
      })
    );

    return NextResponse.json({ teams: teamsWithCounts }, { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/dashboard/[userId]/teams:", err);
    return NextResponse.json(
      { message: "Failed to load dashboard teams" },
      { status: 500 }
    );
  }
}
