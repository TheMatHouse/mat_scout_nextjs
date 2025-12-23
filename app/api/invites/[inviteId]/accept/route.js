export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";
import Team from "@/models/teamModel";

/* ============================================================
   Helpers
============================================================ */
function normalizeRole(role) {
  const r = (role || "member").toLowerCase();
  return ["manager", "coach", "member"].includes(r) ? r : "member";
}

/* ============================================================
   POST — accept a team invitation
============================================================ */
export async function POST(_req, { params }) {
  let session;

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

    session = await mongoose.startSession();
    session.startTransaction();

    const invite = await TeamInvitation.findById(inviteId).session(session);
    if (!invite) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // 🚫 Terminal states
    if (invite.status === "accepted") {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 409 }
      );
    }

    if (invite.status === "declined" || invite.status === "revoked") {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Invitation is no longer valid" },
        { status: 400 }
      );
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // 🔐 Email ownership check
    if (invite.email !== user.email.toLowerCase()) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "This invitation was sent to a different email" },
        { status: 403 }
      );
    }

    const team = await Team.findById(invite.teamId)
      .select("teamSlug")
      .session(session);

    if (!team) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "Team no longer exists" },
        { status: 404 }
      );
    }

    const existingMember = await TeamMember.findOne({
      teamId: invite.teamId,
      userId: user._id,
    }).session(session);

    if (existingMember) {
      await session.abortTransaction();
      return NextResponse.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }

    // ✅ Role is resolved ONCE from payload
    const role = normalizeRole(invite.payload?.role);

    await TeamMember.create(
      [
        {
          teamId: invite.teamId,
          userId: user._id,
          role,
        },
      ],
      { session }
    );

    // ✅ Mark accepted (terminal)
    invite.status = "accepted";
    invite.acceptedAt = new Date();
    await invite.save({ session });

    await session.commitTransaction();

    return NextResponse.json({
      ok: true,
      teamSlug: team.teamSlug,
    });
  } catch (err) {
    console.error("Accept invite error:", err);

    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
    }

    return NextResponse.json(
      {
        error: "Failed to accept invitation",
        detail:
          process.env.NODE_ENV === "development" ? err?.message : undefined,
      },
      { status: 500 }
    );
  } finally {
    if (session) {
      session.endSession();
    }
  }
}
