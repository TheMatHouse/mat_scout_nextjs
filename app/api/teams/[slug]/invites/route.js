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
import sanitizeHtml from "sanitize-html";

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
      // strip everything else (scripts, styles, on* handlers, etc.)
    }).trim();
  }
  return escapeHtml(input).replace(/\r?\n/g, "<br/>");
}

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

  // Display names (HTML-safe)
  const inviterName =
    escapeHtml(me?.name) ||
    escapeHtml([me?.firstName, me?.lastName].filter(Boolean).join(" ")) ||
    escapeHtml(me?.email) ||
    "A team manager";

  const teamName = escapeHtml(team.teamName);
  const inviteeFirst = escapeHtml(firstName || "");
  const inviteeLast = escapeHtml(lastName || "");
  const parentSafe = escapeHtml(parentName || "");

  // Optional coach's note (supports simple HTML, or plain text with line breaks)
  const noteHtml = sanitizeNoteHtml(message?.slice(0, 1000) || "");
  const coachNote = noteHtml
    ? `<blockquote style="margin:14px 0;padding:12px 14px;background:#F3F4F6;border-radius:8px">
         <strong>Note from ${inviterName}:</strong><br/>${noteHtml}
       </blockquote>`
    : "";

  // CTA button + fallback
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

  // Email body (adult vs parent/guardian)
  const body = isMinor
    ? `
      <p>Hi ${parentSafe || "there"},</p>
      <p><strong>${inviterName}</strong> just invited your athlete
         <strong>${inviteeFirst} ${inviteeLast}</strong> to join their team on <strong>MatScout</strong>,
         a platform built for grapplers to share scouting reports, track performance, and stay
         connected with coaches and teammates.</p>

      <p>As part of <strong>${teamName}</strong>, they’ll be able to:</p>
      <ul>
        <li>View and contribute to scouting reports</li>
        <li>Receive team updates and messages</li>
        <li>Track progress and match insights</li>
        <li>Stay in sync with their coach and teammates</li>
      </ul>

      <p>Click below to join the team and set up their profile:</p>
      <p>${ctaBtn}</p>
      ${ctaFallback}
      ${coachNote}

      <p style="margin-top:14px;font-size:12px;color:#6b7280">
        This invitation link expires in 14 days.
      </p>

      <p>Whether you’re a student, coach, parent, or fan—there’s a place for you here.<br/>
      See you on the mat!</p>
    `
    : `
      <p>Hi ${inviteeFirst || "there"},</p>
      <p><strong>${inviterName}</strong> just invited you to join their team on <strong>MatScout</strong>,
         a platform built for grapplers to share scouting reports, track performance, and stay
         connected with coaches and teammates.</p>

      <p>As part of <strong>${teamName}</strong>, you’ll be able to:</p>
      <ul>
        <li>View and contribute to scouting reports</li>
        <li>Receive team updates and messages</li>
        <li>Track your progress and match insights</li>
        <li>Stay in sync with your coach and teammates</li>
      </ul>

      <p>Click below to join the team and set up your profile:</p>
      <p>${ctaBtn}</p>
      ${ctaFallback}
      ${coachNote}

      <p style="margin-top:14px;font-size:12px;color:#6b7280">
        This invitation link expires in 14 days.
      </p>

      <p>Whether you're a student, coach, parent, or fan—there’s a place for you here.<br/>
      See you on the mat!</p>
    `;

  const html = baseEmailTemplate({
    title: `Invitation to join ${teamName}`,
    message: body,
  });

  await Mail.sendEmail({
    type: Mail.kinds.TEAM_INVITE, // respects prefs + 24h dedupe
    toEmail: targetEmail, // user might not exist yet
    subject: `You're invited to join ${teamName} on MatScout`,
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
