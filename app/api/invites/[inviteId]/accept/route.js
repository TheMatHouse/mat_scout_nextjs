export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";

/* ============================================================
   POST — accept a team invitation
============================================================ */
export async function POST(_req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteId } = await params;

    if (!mongoose.Types.ObjectId.isValid(inviteId)) {
      return NextResponse.json(
        { error: "Invalid invitation" },
        { status: 400 }
      );
    }

    const invite = await TeamInvitation.findById(inviteId);
    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Ensure email matches the logged-in user
    if (invite.email !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    const team = await Team.findById(invite.teamId).select("teamSlug");
    if (!team) {
      return NextResponse.json(
        { error: "Team no longer exists" },
        { status: 404 }
      );
    }

    // Prevent duplicate membership
    const existingMember = await TeamMember.findOne({
      teamId: invite.teamId,
      userId: user._id,
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }

    // Create team membership using invite.role
    await TeamMember.create({
      teamId: invite.teamId,
      userId: user._id,
      role: invite.role || "member",
    });

    // Mark invite as accepted
    invite.status = "accepted";
    await invite.save();

    return NextResponse.json({
      success: true,
      teamSlug: team.teamSlug,
    });
  } catch (err) {
    console.error("Accept invite error:", err);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
