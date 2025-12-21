export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";
import User from "@/models/userModel";
import { createNotification } from "@/lib/createNotification";

/* ============================================================
   POST — accept a team invitation (TRANSACTIONAL)
============================================================ */
export async function POST(_req, { params }) {
  const session = await mongoose.startSession();

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

    let teamSlug;

    await session.withTransaction(async () => {
      // Lock invite for this transaction
      const invite = await TeamInvitation.findById(inviteId).session(session);
      if (!invite) {
        throw new Error("INVITE_NOT_FOUND");
      }

      if (invite.status !== "pending") {
        throw new Error("INVITE_NOT_PENDING");
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        throw new Error("INVITE_EXPIRED");
      }

      if (invite.email !== user.email.toLowerCase()) {
        throw new Error("EMAIL_MISMATCH");
      }

      const team = await Team.findById(invite.teamId)
        .select("teamSlug teamName user")
        .session(session);

      if (!team) {
        throw new Error("TEAM_NOT_FOUND");
      }

      teamSlug = team.teamSlug;

      // Prevent duplicate membership
      const existingMember = await TeamMember.findOne({
        teamId: invite.teamId,
        userId: user._id,
      }).session(session);

      if (existingMember) {
        throw new Error("ALREADY_MEMBER");
      }

      // Create team membership
      await TeamMember.create(
        [
          {
            teamId: invite.teamId,
            userId: user._id,
            role: invite.role || "member",
          },
        ],
        { session }
      );

      // Mark invite as accepted
      invite.status = "accepted";
      invite.acceptedAt = new Date();
      await invite.save({ session });

      // In-app notification to inviter or team owner
      const notifyUserId = invite.invitedByUserId || team.user || null;

      if (notifyUserId) {
        await createNotification({
          userId: notifyUserId,
          type: "Team Invitation Accepted",
          body: `${
            user.firstName || user.username || "A user"
          } accepted the invitation to join ${team.teamName}`,
          link: `/teams/${team.teamSlug}/members`,
          session,
        });
      }
    });

    return NextResponse.json({
      success: true,
      teamSlug,
    });
  } catch (err) {
    console.error("Accept invite error:", err);

    const messageMap = {
      INVITE_NOT_FOUND: "Invitation not found",
      INVITE_NOT_PENDING: "Invitation is no longer valid",
      INVITE_EXPIRED: "Invitation has expired",
      EMAIL_MISMATCH: "This invitation was sent to a different email address",
      TEAM_NOT_FOUND: "Team no longer exists",
      ALREADY_MEMBER: "You are already a member of this team",
    };

    return NextResponse.json(
      { error: messageMap[err.message] || "Failed to accept invitation" },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}
