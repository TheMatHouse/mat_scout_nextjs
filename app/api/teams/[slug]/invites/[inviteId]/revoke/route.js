// app/api/teams/[slug]/invites/[inviteId]/revoke/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const { slug, inviteId } = await params;

    const user = await getCurrentUser();
    if (!user?._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team?._id) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const isOwner = String(team.user) === String(user._id);
    const member = await TeamMember.findOne({
      teamId: team._id,
      userId: user._id,
    })
      .select("role")
      .lean();
    const role = (member?.role || (isOwner ? "owner" : "")).toLowerCase();
    const isStaff = isOwner || role === "manager" || role === "coach";
    if (!isStaff) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // HARD DELETE the invitation
    const result = await TeamInvitation.findOneAndDelete({
      _id: inviteId,
      teamId: team._id,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Invitation revoked and deleted.",
    });
  } catch (err) {
    console.error("revoke invite error:", err);
    return NextResponse.json(
      { message: "Server error", detail: String(err) },
      { status: 500 }
    );
  }
}
