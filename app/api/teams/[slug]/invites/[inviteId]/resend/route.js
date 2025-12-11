// app/api/teams/[slug]/invites/[inviteId]/resend/route.js
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import User from "@/models/userModel";
import { Mail } from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";
import sanitizeHtml from "sanitize-html";

export const dynamic = "force-dynamic";

// -------- helpers ----------
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeNoteHtml(input = "") {
  if (!input) return "";
  const looksLikeHtml = /<[^>]+>/.test(input);
  if (looksLikeHtml) {
    return sanitizeHtml(input, {
      allowedTags: [
        "b",
        "strong",
        "i",
        "em",
        "u",
        "br",
        "p",
        "ul",
        "ol",
        "li",
        "span",
      ],
      allowedAttributes: { span: [] },
      allowedSchemes: ["http", "https", "mailto"],
    }).trim();
  }
  return escapeHtml(input).replace(/\r?\n/g, "<br/>");
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return escapeHtml(String(d));
  }
}
// ---------------------------

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
    if (!me) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName teamSlug user"
    );

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const myMembership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
    }).select("role");

    const isOwner = String(team.user) === String(me._id);
    const canManage =
      isOwner || ["manager", "coach"].includes(myMembership?.role);

    if (!canManage) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // ---------------------------------------------
    // FIX: Look for `teamId` OR old `team` field
    // ---------------------------------------------
    const invite = await TeamInvitation.findOne({
      _id: inviteId,
      $or: [
        { teamId: team._id }, // NEW correct field
        { team: team._id }, // OLD field (backward compatibility)
      ],
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

    let inviterName = "A team manager";
    if (invite.invitedBy && isValidObjectId(invite.invitedBy)) {
      const inviter = await User.findById(invite.invitedBy)
        .select("name firstName lastName email")
        .lean();
      if (inviter) {
        inviterName =
          escapeHtml(inviter.name) ||
          escapeHtml(
            [inviter.firstName, inviter.lastName].filter(Boolean).join(" ")
          ) ||
          escapeHtml(inviter.email) ||
          inviterName;
      }
    }

    const teamName = escapeHtml(team.teamName);
    const inviteeFirst = escapeHtml(invite.inviteeFirstName || "");
    const inviteeLast = escapeHtml(inviteeLastName || "");
    const parentSafe = escapeHtml(invite.parentName || "");
    const targetEmail =
      (invite.isMinor ? invite.parentEmail : invite.email) || "";
    const noteHtml = sanitizeNoteHtml(invite.message || "");
    const expiresOn = formatDate(invite.expiresAt);

    const coachNote = noteHtml
      ? `<blockquote style="margin:14px 0;padding:12px 14px;background:#F3F4F6;border-radius:8px">
           <strong>Note from ${inviterName}:</strong><br/>${noteHtml}
         </blockquote>`
      : "";

    const ctaBtn = `
      <a href="${acceptUrl}"
         style="display:inline-block;padding:12px 18px;background:#1a73e8;color:#ffffff;
                border-radius:8px;text-decoration:none;font-weight:700">
        Join Team
      </a>`;

    const ctaFallback = `
      <p style="margin-top:10px;font-size:12px;color:#6b7280">
        Or paste this link into your browser:<br/>
        <span style="word-break:break-all">${acceptUrl}</span>
      </p>`;

    const body = invite.isMinor
      ? `
        <p>Hi ${parentSafe || "there"},</p>
        <p><strong>${inviterName}</strong> just invited your athlete
           <strong>${inviteeFirst} ${inviteeLast}</strong> to join their team on <strong>MatScout</strong>.</p>

        <p>Click below to join the team:</p>
        <p>${ctaBtn}</p>
        ${ctaFallback}
        ${coachNote}

        <p style="margin-top:14px;font-size:12px;color:#6b7280">
          This invitation link expires on <strong>${expiresOn}</strong>.
        </p>`
      : `
        <p>Hi ${inviteeFirst || "there"},</p>
        <p><strong>${inviterName}</strong> invited you to join their team on <strong>MatScout</strong>.</p>

        <p>Click below to join the team:</p>
        <p>${ctaBtn}</p>
        ${ctaFallback}
        ${coachNote}

        <p style="margin-top:14px;font-size:12px;color:#6b7280">
          This invitation link expires on <strong>${expiresOn}</strong>.
        </p>`;

    const html = baseEmailTemplate({
      title: `Invitation to join ${teamName}`,
      message: body,
    });

    await Mail.sendEmail({
      type: Mail.kinds.TEAM_INVITE,
      toEmail: targetEmail,
      subject: `You're invited to join ${teamName} on MatScout`,
      html,
      teamId: team._id.toString(),
    });

    return NextResponse.json({ message: "Invitation resent" }, { status: 200 });
  } catch (err) {
    console.error("POST /invites/[inviteId]/resend failed:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
