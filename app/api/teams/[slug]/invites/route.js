// app/api/teams/[slug]/invites/route.js
import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import { getCurrentUser } from "@/lib/auth-server";
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

export async function POST(req, ctx) {
  await connectDB();
  const { slug } = await ctx.params;

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select(
    "_id teamName teamSlug user"
  );
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Ensure requester is a manager
  const myMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  });
  if (!myMembership || myMembership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    firstName,
    lastName,
    role,
    email,
    isMinor = false,
    parentName,
    parentEmail,
    message,
  } = await req.json();

  if (!["member", "coach", "manager"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const targetEmail = (isMinor ? parentEmail : email)?.toLowerCase().trim();
  if (!targetEmail) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const invite = await TeamInvitation.create({
    teamId: team._id,
    role,
    email: isMinor ? undefined : targetEmail,
    isMinor,
    parentName: isMinor ? parentName : undefined,
    parentEmail: isMinor ? targetEmail : undefined,
    inviteeFirstName: firstName,
    inviteeLastName: lastName,
    message: message?.slice(0, 1000),
    token,
    expiresAt,
    invitedBy: me._id,
  });

  const acceptUrl = `${
    process.env.NEXT_PUBLIC_DOMAIN
  }/accept-invite?token=${encodeURIComponent(token)}`;

  const body = isMinor
    ? `
      <p>Hi ${parentName || "there"},</p>
      <p><strong>${
        team.teamName
      }</strong> has invited your athlete <strong>${firstName} ${lastName}</strong> to join as <strong>${role}</strong>.</p>
      <p>Please accept and create/confirm your athlete’s profile.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
      ${
        message
          ? `<p style="margin-top:12px;"><em>Message:</em> ${message}</p>`
          : ""
      }
    `
    : `
      <p>Hi ${firstName || "there"},</p>
      <p><strong>${
        team.teamName
      }</strong> has invited you to join as <strong>${role}</strong>.</p>
      <p>Please accept to join the team.</p>
      <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#1a73e8;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Accept Invitation</a></p>
      ${
        message
          ? `<p style="margin-top:12px;"><em>Message:</em> ${message}</p>`
          : ""
      }
    `;

  const html = baseEmailTemplate({
    title: `Invitation to join ${team.teamName}`,
    message: body,
  });

  await Mail.sendEmail({
    type: Mail.kinds.TEAM_INVITE, // respects prefs + 24h dedupe
    toEmail: targetEmail, // user might not exist yet
    subject: `You're invited to join ${team.teamName} on MatScout`,
    html,
    teamId: team._id.toString(), // for dedupe
  });

  return NextResponse.json({ ok: true, inviteId: invite._id }, { status: 201 });
}

export async function GET(_req, ctx) {
  await connectDB();
  const { slug } = await ctx.params;

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select("_id");
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const myMembership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  });
  if (!myMembership || myMembership.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const invites = await TeamInvitation.find({
    teamId: team._id,
    revokedAt: { $exists: false },
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites }, { status: 200 });
}
