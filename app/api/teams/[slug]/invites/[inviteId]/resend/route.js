// app/api/teams/[slug]/invites/[inviteId]/resend/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

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

    const inv = await TeamInvitation.findOne({
      _id: inviteId,
      teamId: team._id,
    }).lean();
    if (!inv) {
      return NextResponse.json(
        { message: "Invite not found" },
        { status: 404 }
      );
    }

    // (Optionally) refresh token / extend expiry here…

    // Send email (basic example)
    try {
      const subject = `Invitation to join ${team.teamName}`;
      const html = baseEmailTemplate(
        `You've been invited to join ${team.teamName} on MatScout.`,
        /* body content here */
        `<p>Click the invite link to accept.</p>`
      );
      await Mail.send({
        to: inv.email,
        subject,
        html,
      });
    } catch (mailErr) {
      console.error("resend mail error:", mailErr);
      // Don't fail the whole request if mail provider hiccups
    }

    return NextResponse.json({ ok: true, message: "Invitation resent." });
  } catch (err) {
    console.error("resend invite error:", err);
    return NextResponse.json(
      { message: "Server error", detail: err?.message || String(err) },
      { status: 500 }
    );
  }
}
