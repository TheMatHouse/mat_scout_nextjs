// app/api/teams/[slug]/invites/[inviteId]/resend/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import User from "@/models/userModel";

import Mail from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

/* ============================================================
   Helpers
============================================================ */

function isStaffRole(role) {
  return ["owner", "manager", "coach"].includes((role || "").toLowerCase());
}

/* ============================================================
   POST — resend invite
============================================================ */
export async function POST(_req, { params }) {
  try {
    await connectDB();

    const { slug, inviteId } = await params;

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName teamSlug user userId"
    );
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const ownerId = String(team.user || team.userId || "");
    const isOwner = ownerId === String(actor._id);

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: actor._id,
    })
      .select("role")
      .lean();

    if (!(isOwner || isStaffRole(membership?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invite = await TeamInvitation.findById(inviteId);
    if (!invite || String(invite.teamId) !== String(team._id)) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation is not resendable" },
        { status: 400 }
      );
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invites/${invite._id}`;

    const html = baseEmailTemplate({
      title: "You’ve been invited to a team",
      message: `
        <p>You’ve been invited to join <strong>${
          team.teamName
        }</strong> on MatScout.</p>
        <p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#1a73e8;color:#fff;
                    padding:10px 16px;border-radius:4px;text-decoration:none;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation expires on ${invite.expiresAt?.toLocaleDateString()}.</p>
      `,
    });

    await Mail.sendEmail({
      type: Mail.kinds.TEAM_INVITE,
      toEmail: invite.email,
      subject: `Invitation to join ${team.teamName}`,
      html,
      relatedUserId: actor._id,
      teamId: String(team._id),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("POST /invites/[inviteId]/resend error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
