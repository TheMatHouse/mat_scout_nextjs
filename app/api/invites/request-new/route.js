export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { createNotification } from "@/lib/createNotification";

export async function POST(req) {
  await connectDB();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = await req.json();
  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  const team = await Team.findById(teamId).select("_id teamName");
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Notify staff
  const staff = await TeamMember.find({
    teamId,
    role: { $in: ["owner", "manager", "coach"] },
  }).select("userId");

  for (const m of staff) {
    await createNotification({
      userId: m.userId,
      type: "Invite Request",
      body: `${user.email} requested a new invitation to ${team.teamName}`,
      link: `/team/${team._id}/members`,
    });
  }

  return NextResponse.json({ ok: true });
}
