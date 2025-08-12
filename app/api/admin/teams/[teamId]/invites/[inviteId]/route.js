// app/api/admin/teams/[teamId]/invites/[inviteId]/revoke/route.js
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamInvitation from "@/models/teamInvitationModel";

export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  try {
    await connectDB();
    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meDoc = await User.findById(me._id).select("role isAdmin").lean();
    const isAdmin = !!(meDoc?.isAdmin || meDoc?.role === "admin");
    if (!isAdmin)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { teamId, inviteId } = await params;
    if (!isValidObjectId(teamId) || !isValidObjectId(inviteId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const team = await Team.findById(teamId).select("_id").lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const invite = await TeamInvitation.findOneAndUpdate(
      {
        _id: inviteId,
        teamId: team._id,
        revokedAt: { $exists: false },
        acceptedAt: { $exists: false },
      },
      { revokedAt: new Date() },
      { new: true }
    ).lean();

    if (!invite)
      return NextResponse.json(
        { error: "Invite not found or already closed" },
        { status: 404 }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      "POST /api/admin/teams/:teamId/invites/:inviteId/revoke failed:",
      err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
