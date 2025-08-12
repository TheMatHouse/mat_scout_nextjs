// app/api/teams/[slug]/invites/[inviteId]/revoke/route.js
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  try {
    await connectDB();

    const { slug, inviteId } = params; // <-- matches folder name
    if (!inviteId || !isValidObjectId(inviteId)) {
      return NextResponse.json(
        { message: "Invalid invite id" },
        { status: 400 }
      );
    }

    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const team = await Team.findOne({ teamSlug: slug }).select("_id teamName");
    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
    }).select("role");

    if (!membership || membership.role !== "manager") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      teamId: team._id,
    });

    if (!invite) {
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 }
      );
    }
    if (invite.acceptedAt) {
      return NextResponse.json(
        { message: "Invite already accepted" },
        { status: 409 }
      );
    }
    if (invite.revokedAt) {
      return NextResponse.json(
        { message: "Invite already revoked" },
        { status: 409 }
      );
    }

    invite.revokedAt = new Date();
    invite.revokedBy = me._id;
    await invite.save();

    return NextResponse.json(
      { message: "Invitation revoked" },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /invites/[inviteId]/revoke failed:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
