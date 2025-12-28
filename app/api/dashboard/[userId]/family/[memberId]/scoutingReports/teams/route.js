// app/api/dashboard/[userId]/family/[memberId]/scoutingReports/teams/route.js

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";

const oid = (id) => new Types.ObjectId(id);

export async function GET(_req, { params }) {
  await connectDB();

  const { userId, memberId } = await params;

  if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(memberId)) {
    return NextResponse.json(
      { message: "Invalid userId or memberId" },
      { status: 400 }
    );
  }

  // --------------------------------------------------
  // Auth: user must be logged in and match userId
  // --------------------------------------------------
  const me = await getCurrentUserFromCookies();
  if (!me) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (String(me._id) !== String(userId)) {
    return NextResponse.json({ message: "Not authorized" }, { status: 403 });
  }

  // --------------------------------------------------
  // Find DISTINCT teams that have TEAM-OWNED scouting
  // reports for this family member
  // --------------------------------------------------
  const teamIds = await CoachMatchNote.distinct("team", {
    athleteType: "family",
    athleteId: oid(memberId),
    team: { $ne: null },
    $or: [{ deletedAt: null }, { deleted: { $ne: true } }],
  });

  if (!teamIds.length) {
    return NextResponse.json({ teams: [] });
  }

  // --------------------------------------------------
  // Load teams + security info
  // --------------------------------------------------
  const teams = await Team.find(
    { _id: { $in: teamIds } },
    {
      teamName: 1,
      teamSlug: 1,
      security: 1,
    }
  ).lean();

  // --------------------------------------------------
  // Build response (matches TeamScoutingReportsTab needs)
  // --------------------------------------------------
  const result = teams.map((t) => ({
    teamId: String(t._id),
    teamName: t.teamName || "Team",
    teamSlug: t.teamSlug,
    lockEnabled: !!t?.security?.lockEnabled,
  }));

  return NextResponse.json({ teams: result });
}
