// app/api/invitations/lookup/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import TeamInvitation from "@/models/teamInvitationModel";
import Team from "@/models/teamModel";

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const invite = await TeamInvitation.findOne({
    token,
    revokedAt: { $exists: false },
  })
    .select(
      "teamId role isMinor inviteeFirstName inviteeLastName expiresAt acceptedAt"
    )
    .lean();

  if (!invite || invite.expiresAt < new Date() || invite.acceptedAt) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 404 }
    );
  }

  const team = await Team.findById(invite.teamId)
    .select("teamName teamSlug")
    .lean();
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({
    invite: {
      role: invite.role,
      isMinor: invite.isMinor,
      firstName: invite.inviteeFirstName,
      lastName: invite.inviteeLastName,
      expiresAt: invite.expiresAt,
      teamName: team.teamName,
      teamSlug: team.teamSlug,
    },
  });
}
