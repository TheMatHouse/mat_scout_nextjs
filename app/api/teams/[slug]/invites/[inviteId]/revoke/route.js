export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamInvitation from "@/models/teamInvitationModel";
import TeamMember from "@/models/teamMemberModel";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { slug, inviteId } = await params;

    // ✅ FIX: correct lookup field is teamSlug, not slug
    const team = await Team.findOne({ teamSlug: slug }).select("_id user");
    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    // ---------------------------------------------
    // Staff check (owner / manager / coach)
    // ---------------------------------------------
    const membership = await TeamMember.findOne({
      teamId: team._id, // ✅ FIXED
      userId: actor._id, // ✅ FIXED
    }).select("role");

    const isOwner = String(team.user) === String(actor._id);
    const isStaff =
      isOwner ||
      ["manager", "coach"].includes((membership?.role || "").toLowerCase());

    if (!isStaff)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // ---------------------------------------------
    // Find the invite using BOTH possible fields:
    //  teamId (new) OR team (old)
    // ---------------------------------------------
    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      $or: [
        { teamId: team._id }, // NEW correct field
        { team: team._id }, // OLD legacy field
      ],
    });

    if (!invite)
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 }
      );

    if (invite.status === "accepted") {
      return NextResponse.json(
        { message: "Invitation already accepted." },
        { status: 409 }
      );
    }

    if (invite.status === "revoked") {
      return NextResponse.json({ message: "Invitation already revoked." });
    }

    // ---------------------------------------------
    // Revoke the invite
    // ---------------------------------------------
    invite.status = "revoked";
    invite.revokedAt = new Date();
    invite.revokedBy = actor._id;
    await invite.save();

    return NextResponse.json({ message: "Invitation revoked." });
  } catch (err) {
    console.error("Revoke invite error:", err);
    return NextResponse.json(
      { message: "Failed to revoke invite" },
      { status: 500 }
    );
  }
}
