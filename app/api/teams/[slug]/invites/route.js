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

/* ------------------ helpers ------------------ */
const norm = (s = "") => String(s).trim();
const lower = (s = "") => norm(s).toLowerCase();

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
      allowedTags: ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li"],
      allowedAttributes: {},
    }).trim();
  }
  return escapeHtml(input).replace(/\r?\n/g, "<br/>");
}

function canManage(team, membership, meId) {
  return (
    String(team.user) === String(meId) ||
    membership?.role === "manager" ||
    membership?.role === "coach"
  );
}

function activeFilter(teamId) {
  const now = new Date();
  return {
    teamId,
    acceptedAt: { $exists: false },
    revokedAt: { $exists: false },
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: { $exists: false } }],
  };
}

/* ------------------ POST ------------------ */
export async function POST(req, { params }) {
  await connectDB();
  const { slug } = await params;

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select(
    "_id teamName teamSlug user"
  );
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  })
    .select("role")
    .lean();

  if (!canManage(team, membership, me._id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const role = body.role;
  const isMinor = !!body.isMinor;

  // invitee names
  const inviteeFirstName = norm(body.inviteeFirstName ?? body.firstName ?? "");
  const inviteeLastName = norm(body.inviteeLastName ?? body.lastName ?? "");

  // emails
  const email = lower(body.email ?? "");
  const parentEmail = lower(body.parentEmail ?? "");

  // only defined if minor
  const parentFirstName = isMinor ? norm(body.parentFirstName ?? "") : "";
  const parentLastName = isMinor ? norm(body.parentLastName ?? "") : "";

  const message = body.message?.slice(0, 1000) || "";

  /* ---------- validations ---------- */
  if (!["member", "coach", "manager"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!inviteeFirstName || !inviteeLastName) {
    return NextResponse.json(
      { error: "Invitee name required" },
      { status: 400 }
    );
  }

  if (!isMinor && !email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  if (isMinor) {
    if (!parentFirstName || !parentLastName) {
      return NextResponse.json(
        { error: "Parent first and last name required" },
        { status: 400 }
      );
    }
    if (!parentEmail) {
      return NextResponse.json(
        { error: "Parent email required" },
        { status: 400 }
      );
    }
  }

  /* ---------- duplicate checks ---------- */
  const existing = await TeamInvitation.find(activeFilter(team._id))
    .select(
      "isMinor email parentEmail inviteeFirstName inviteeLastName role teamId"
    )
    .lean();

  const firstLower = lower(inviteeFirstName);
  const lastLower = lower(inviteeLastName);
  let duplicate = false;

  if (!isMinor) {
    duplicate = existing.some(
      (i) =>
        !i.isMinor &&
        i.teamId.toString() === team._id.toString() &&
        lower(i.email || "") === email &&
        i.role === role
    );
  } else {
    duplicate = existing.some(
      (i) =>
        i.isMinor &&
        i.teamId.toString() === team._id.toString() &&
        lower(i.parentEmail || "") === parentEmail &&
        lower(i.inviteeFirstName || "") === firstLower &&
        lower(i.inviteeLastName || "") === lastLower &&
        i.role === role
    );
  }

  if (duplicate) {
    return NextResponse.json(
      { error: "Duplicate invite already exists for this recipient." },
      { status: 409 }
    );
  }

  /* ---------- create ---------- */
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const invite = await TeamInvitation.create({
    teamId: team._id,
    role,
    isMinor,
    email: isMinor ? undefined : email,
    parentEmail: isMinor ? parentEmail : undefined,
    parentFirstName: isMinor ? parentFirstName : undefined,
    parentLastName: isMinor ? parentLastName : undefined,
    inviteeFirstName,
    inviteeLastName,
    message,

    // Store top-level for convenience (if your schema allows it)...
    token,
    expiresAt,

    invitedBy: me._id,

    // ...and ALWAYS store in payload so lookup/accept can read them reliably.
    payload: {
      ...(body.payload || {}),
      token,
      expiresAt,
      role,
      firstName: isMinor ? inviteeFirstName : undefined,
      lastName: isMinor ? inviteeLastName : undefined,
    },
  });

  /* ---------- email ---------- */
  const acceptUrl = `${
    process.env.NEXT_PUBLIC_DOMAIN
  }/accept-invite?token=${encodeURIComponent(token)}`;

  const inviterName =
    escapeHtml(me?.name) ||
    escapeHtml([me?.firstName, me?.lastName].filter(Boolean).join(" ")) ||
    escapeHtml(me?.email);

  const teamName = escapeHtml(team.teamName);
  const inviteeFirst = escapeHtml(inviteeFirstName);
  const inviteeLast = escapeHtml(inviteeLastName);

  const noteHtml = sanitizeNoteHtml(message);
  const coachNote = noteHtml
    ? `<blockquote style="margin:14px 0;padding:12px 14px;background:#F3F4F6;border-radius:8px">
         <strong>Note from ${inviterName}:</strong><br/>${noteHtml}
       </blockquote>`
    : "";

  const ctaBtn = `
    <a href="${acceptUrl}"
       style="display:inline-block;padding:12px 18px;background:#1a73e8;color:#fff;
              border-radius:8px;text-decoration:none;font-weight:700">
      Join Team
    </a>`;

  const parentFullName = isMinor
    ? escapeHtml(
        [parentFirstName, parentLastName].filter(Boolean).join(" ") || "there"
      )
    : "";

  const bodyHtml = isMinor
    ? `
      <p>Hi ${parentFullName},</p>
      <p><strong>${inviterName}</strong> invited your athlete
         <strong>${inviteeFirst} ${inviteeLast}</strong> to join <strong>${teamName}</strong> on MatScout.</p>
      <ul>
        <li>View and contribute to scouting reports</li>
        <li>Receive team updates and messages</li>
        <li>Track progress and match insights</li>
        <li>Stay in sync with their coach and teammates</li>
      </ul>
      <p>${ctaBtn}</p>
      ${coachNote}
      <p style="font-size:12px;color:#666;margin-top:10px">This link expires in 14 days.</p>
    `
    : `
      <p>Hi ${inviteeFirst || "there"},</p>
      <p><strong>${inviterName}</strong> invited you to join <strong>${teamName}</strong> on MatScout.</p>
      <ul>
        <li>View and contribute to scouting reports</li>
        <li>Receive team updates and messages</li>
        <li>Track your progress and match insights</li>
        <li>Stay in sync with your coach and teammates</li>
      </ul>
      <p>${ctaBtn}</p>
      ${coachNote}
      <p style="font-size:12px;color:#666;margin-top:10px">This link expires in 14 days.</p>
    `;

  const html = baseEmailTemplate({
    title: `Invitation to join ${teamName}`,
    message: bodyHtml,
  });

  await Mail.sendEmail({
    type: Mail.kinds.TEAM_INVITE,
    toEmail: isMinor ? parentEmail : email,
    subject: `You're invited to join ${teamName} on MatScout`,
    html,
    teamId: team._id.toString(),
  });

  return NextResponse.json({ ok: true, inviteId: invite._id }, { status: 201 });
}

/* ------------------ GET ------------------ */
export async function GET(_req, { params }) {
  await connectDB();
  const { slug } = await params;

  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).select(
    "_id teamName user"
  );
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId: me._id,
  })
    .select("role")
    .lean();

  if (!canManage(team, membership, me._id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const invites = await TeamInvitation.find(activeFilter(team._id))
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites }, { status: 200 });
}
