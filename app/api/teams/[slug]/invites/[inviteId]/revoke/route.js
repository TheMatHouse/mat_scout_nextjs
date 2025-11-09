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

    const team = await Team.findOne({ slug }).select("_id");
    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    // Ensure staff
    const membership = await TeamMember.findOne({
      team: team._id,
      user: actor._id,
    }).select("role");
    const isStaff = ["owner", "manager", "coach"].includes(
      (membership?.role || "").toLowerCase()
    );
    if (!isStaff)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      team: team._id,
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
