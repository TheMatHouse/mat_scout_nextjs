// app/api/teams/[slug]/invites/[inviteId]/resend/route.js
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { Mail } from "@/lib/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export const dynamic = "force-dynamic";

export async function POST(_req, { params }) {
  try {
    await connectDB();

    const { slug, inviteId } = await params;
    if (!isValidObjectId(inviteId)) {
      return NextResponse.json(
        { message: "Invalid invite id" },
        { status: 400 }
      );
    }

    const me = await getCurrentUser();
    if (!me)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName teamSlug"
    );
    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    const myMembership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
    }).select("role");
    if (!myMembership || myMembership.role !== "manager") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Load active, unrevoked, unaccepted, unexpired invite
    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      teamId: team._id,
      revokedAt: { $exists: false },
      acceptedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!invite) {
      return NextResponse.json(
        { message: "Invite not found or not resendable" },
        { status: 404 }
      );
    }

    const acceptUrl = `${
      process.env.NEXT_PUBLIC_DOMAIN
    }/accept-invite?token=${encodeURIComponent(invite.token)}`;

    const targetEmail =
      (invite.isMinor ? invite.parentEmail : invite.email) || "";
    const body = invite.isMinor
      ? `
        <p>Hi ${invite.parentName || "there"},</p>
        <p><strong>${team.teamName}</strong> has invited your athlete <strong>${
          invite.inviteeFirstName
        } ${invite.inviteeLastName}</strong> to join as <strong>${
          invite.role
        }</strong>.</p>
        <p>Please accept and create/confirm your athlete’s profile.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
        ${
          invite.message
            ? `<p style="margin-top:12px;"><em>Message:</em> ${invite.message}</p>`
            : ""
        }
      `
      : `
        <p>Hi ${invite.inviteeFirstName || "there"},</p>
        <p><strong>${
          team.teamName
        }</strong> has invited you to join as <strong>${
          invite.role
        }</strong>.</p>
        <p>Please accept to join the team.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
        ${
          invite.message
            ? `<p style="margin-top:12px;"><em>Message:</em> ${invite.message}</p>`
            : ""
        }
      `;

    const html = baseEmailTemplate({
      title: `Invitation to join ${team.teamName}`,
      message: body,
    });

    await Mail.sendEmail({
      type: Mail.kinds.TEAM_INVITE, // respects prefs + 24h dedupe
      toEmail: targetEmail,
      subject: `You're invited to join ${team.teamName} on MatScout`,
      html,
      teamId: team._id.toString(),
    });

    return NextResponse.json({ message: "Invitation resent" }, { status: 200 });
  } catch (err) {
    console.error("POST /invites/[inviteId]/resend failed:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
