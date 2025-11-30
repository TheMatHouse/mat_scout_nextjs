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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow a user to load THEIR teams
    if (String(viewer._id) !== String(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ---------------------------------------------------------------
       (1) Teams where user is a member (TeamMember rows)
    ---------------------------------------------------------------- */
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

    /* ---------------------------------------------------------------
       (2) Teams where user is the owner
    ---------------------------------------------------------------- */
    const ownerTeams = await Team.find({ user: userId })
      .select("teamName teamSlug logoURL security")
      .lean();

    /* ---------------------------------------------------------------
       (3) Merge without duplicates
    ---------------------------------------------------------------- */
    const map = new Map();

    for (const t of memberTeams) {
      map.set(String(t._id), t);
    }

    for (const t of ownerTeams) {
      const tid = String(t._id);
      if (!map.has(tid)) {
        map.set(tid, t);
      }
    }

    const teamsArray = Array.from(map.values());

    /* ---------------------------------------------------------------
       (4) Count scouting reports for each team
    ---------------------------------------------------------------- */
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

    // IMPORTANT FIX:
    // Always return a clean JSON object, nothing else.
    return new Response(JSON.stringify(teamsWithCounts), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Error in GET /api/dashboard/[userId]/teams:", err);

    return NextResponse.json(
      { error: "Failed to load dashboard teams" },
      { status: 500 }
    );
  }
}
