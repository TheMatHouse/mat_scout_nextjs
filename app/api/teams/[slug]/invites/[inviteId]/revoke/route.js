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

    const { slug, inviteId } = params;
    if (!inviteId || !isValidObjectId(inviteId)) {
      return NextResponse.json(
        { message: "Invalid invite id" },
        { status: 400 }
      );
    }

    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // Need owner to allow, or staff
    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName user"
    );
    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
    }).select("role");

    const isOwner = String(team.user) === String(me._id);
    const canManage =
      isOwner || ["manager", "coach"].includes(membership?.role);
    if (!canManage)
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    // Only delete if it's still pending (not accepted)
    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      teamId: team._id,
    }).select("_id acceptedAt status");

    if (!invite) {
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 }
      );
    }
    if (invite.acceptedAt || invite.status === "accepted") {
      return NextResponse.json(
        { message: "Invite already accepted" },
        { status: 409 }
      );
    }

    await TeamInvitation.deleteOne({ _id: inviteId, teamId: team._id });

    return NextResponse.json(
      {
        message: "Invitation revoked (deleted)",
        inviteId: inviteId.toString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /invites/[inviteId]/revoke failed:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
