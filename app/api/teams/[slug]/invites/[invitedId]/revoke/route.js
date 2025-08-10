// app/api/teams/[slug]/invites/[inviteId]/revoke/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(_req, ctx) {
  await connectDB();
  const { slug, invited } = await ctx.params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select("_id");
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const myMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  });
  if (!myMembership || myMembership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await TeamInvitation.findOne({
    _id: inviteId,
    teamId: team._id,
  });
  if (!invite || invite.acceptedAt || invite.revokedAt) {
    return NextResponse.json(
      { error: "Invite not revokable" },
      { status: 400 }
    );
  }

  invite.revokedAt = new Date();
  await invite.save();

  return NextResponse.json({ ok: true }, { status: 200 });
}
