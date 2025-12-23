export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";

export async function POST(_req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug, inviteId } = await params;

    if (!mongoose.Types.ObjectId.isValid(inviteId)) {
      return NextResponse.json(
        { error: "Invalid invitation id" },
        { status: 400 }
      );
    }

    // -------------------------------------------------
    // Load team (slug → _id)
    // -------------------------------------------------
    const team = await Team.findOne({ teamSlug: slug }).select("_id user");
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // -------------------------------------------------
    // Staff authorization
    // -------------------------------------------------
    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: actor._id,
    }).select("role");

    const isOwner = String(team.user) === String(actor._id);
    const isStaff =
      isOwner ||
      ["manager", "coach"].includes((membership?.role || "").toLowerCase());

    if (!isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // -------------------------------------------------
    // Find invite (NEW schema only; legacy safe)
    // -------------------------------------------------
    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      teamId: team._id,
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invite.status === "accepted") {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 409 }
      );
    }

    if (invite.status === "revoked") {
      return NextResponse.json(
        { message: "Invitation already revoked" },
        { status: 200 }
      );
    }

    // -------------------------------------------------
    // Revoke
    // -------------------------------------------------
    invite.status = "revoked";
    invite.revokedAt = new Date();
    invite.revokedBy = actor._id;

    await invite.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Revoke invite error:", err);
    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
