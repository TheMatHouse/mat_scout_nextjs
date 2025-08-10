// app/api/invitations/accept/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

export async function POST(req) {
  await connectDB();
  const { token, familyMemberId, createFamily } = await req.json();

  const invite = await TeamInvitation.findOne({
    token,
    revokedAt: { $exists: false },
  });
  if (!invite || invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired invitation" },
      { status: 400 }
    );
  }

  const team = await Team.findById(invite.teamId).select(
    "_id teamSlug teamName"
  );
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const user = await getCurrentUserFromCookies();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Optional: require the invited email matches the logged-in user for adult invites
  if (!invite.isMinor) {
    const invited = (invite.email || "").toLowerCase().trim();
    const loggedIn = (user.email || "").toLowerCase().trim();
    if (invited && invited !== loggedIn) {
      return NextResponse.json(
        { error: "Please sign in with the invited email" },
        { status: 400 }
      );
    }
  }

  const membershipPayload = { teamId: team._id, role: invite.role };

  if (invite.isMinor) {
    // Parent is accepting
    let familyMemberDoc = null;

    if (familyMemberId) {
      familyMemberDoc = await FamilyMember.findOne({
        _id: familyMemberId,
        userId: user._id,
      });
      if (!familyMemberDoc) {
        return NextResponse.json(
          { error: "Invalid family member" },
          { status: 400 }
        );
      }
    } else if (createFamily) {
      familyMemberDoc = await FamilyMember.create({
        userId: user._id,
        firstName: invite.inviteeFirstName,
        lastName: invite.inviteeLastName,
      });
    } else {
      return NextResponse.json(
        { error: "Family member required" },
        { status: 400 }
      );
    }

    membershipPayload.familyMemberId = familyMemberDoc._id;
    membershipPayload.userId = user._id; // parent owner
  } else {
    membershipPayload.userId = user._id;
  }

  // Upsert membership (idempotent)
  await TeamMember.updateOne(
    {
      teamId: team._id,
      ...(membershipPayload.familyMemberId
        ? { familyMemberId: membershipPayload.familyMemberId }
        : { userId: user._id, familyMemberId: { $exists: false } }),
    },
    { $setOnInsert: membershipPayload },
    { upsert: true }
  );

  invite.acceptedAt = new Date();
  invite.acceptedByUserId = user._id;
  await invite.save();

  return NextResponse.json(
    { ok: true, teamSlug: team.teamSlug },
    { status: 200 }
  );
}
