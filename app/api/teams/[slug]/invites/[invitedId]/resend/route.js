// app/api/teams/[slug]/invites/[inviteId]/resend/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";
import { Mail } from "@/lib/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(_req, ctx) {
  await connectDB();

  const { slug, invited } = await ctx.params;

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select(
    "_id teamName teamSlug"
  );
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const myMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  });
  if (!myMembership || myMembership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invite = await TeamInvitation.findOne({
    _id: inviteId,
    teamId: team._id,
  });
  if (!invite || invite.revokedAt || invite.acceptedAt) {
    return NextResponse.json(
      { error: "Invite not resendable" },
      { status: 400 }
    );
  }
  if (invite.expiresAt < new Date()) {
    // auto-extend expired invite
    invite.expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await invite.save();
  }

  const acceptUrl = `${
    process.env.NEXT_PUBLIC_DOMAIN
  }/accept-invite?token=${encodeURIComponent(invite.token)}`;

  const firstName = invite.inviteeFirstName || "there";
  const lastName = invite.inviteeLastName || "";
  const message = invite.message;

  const body = invite.isMinor
    ? `
      <p>Hi ${invite.parentName || "there"},</p>
      <p>Reminder: <strong>${
        team.teamName
      }</strong> invited your athlete <strong>${firstName} ${lastName}</strong> as <strong>${
        invite.role
      }</strong>.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
      ${
        message
          ? `<p style="margin-top:12px;"><em>Message:</em> ${message}</p>`
          : ""
      }
    `
    : `
      <p>Hi ${firstName},</p>
      <p>Reminder: <strong>${
        team.teamName
      }</strong> invited you to join as <strong>${invite.role}</strong>.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
      ${
        message
          ? `<p style="margin-top:12px;"><em>Message:</em> ${message}</p>`
          : ""
      }
    `;

  const html = baseEmailTemplate({
    title: `Reminder: Invitation to join ${team.teamName}`,
    message: body,
  });

  const toEmail = (invite.isMinor ? invite.parentEmail : invite.email)
    ?.toLowerCase()
    .trim();
  if (!toEmail)
    return NextResponse.json(
      { error: "Invite missing email" },
      { status: 400 }
    );

  const result = await Mail.sendEmail({
    type: Mail.kinds.TEAM_INVITE,
    toEmail,
    subject: `Reminder: Join ${team.teamName} on MatScout`,
    html,
    teamId: team._id.toString(),
  });

  return NextResponse.json(
    { ok: !!result.sent, reason: result.reason },
    { status: 200 }
  );
}
