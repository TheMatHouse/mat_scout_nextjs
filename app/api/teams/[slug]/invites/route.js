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

<<<<<<< fix/team-invites
function sanitizeNoteHtml(input = "") {
  if (!input) return "";
  const looksLikeHtml = /<[^>]+>/.test(input);
  if (looksLikeHtml) {
    return sanitizeHtml(input, {
      allowedTags: ["b", "strong", "i", "em", "u", "br", "p", "ul", "ol", "li"],
      allowedAttributes: {},
    }).trim();
=======
// GET: list invites (defaults to pending only)
export async function GET(req, { params }) {
  try {
    await connectDB();
    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id user userId teamName"
    );
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // staff check
    const ownerId = String(team.user || team.userId || "");
    const isOwner = ownerId && ownerId === String(actor._id);
    const link = await TeamMember.findOne({
      teamId: team._id,
      userId: actor._id,
    })
      .select("role")
      .lean();
    if (!(isOwner || isStaffRole(link?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "pending").toLowerCase();
    const allowed = ["pending", "accepted", "revoked", "expired"];
    const query = {
      teamId: team._id, // ✅ FIXED
      ...(allowed.includes(status) ? { status } : { status: "pending" }),
    };

    const invites = await TeamInvitation.find(query)
      .sort({ createdAt: -1 })
      .select(
        "_id email status createdAt acceptedAt expiresAt invitedBy acceptedMember"
      );

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("GET /invites error:", err);
    return NextResponse.json({ invites: [] }, { status: 200 });
>>>>>>> local
  }
  return escapeHtml(input).replace(/\r?\n/g, "<br/>");
}

<<<<<<< fix/team-invites
const canManage = (team, membership, meId) =>
  String(team.user) === String(meId) ||
  membership?.role === "manager" ||
  membership?.role === "coach";

/* ------------------ POST ------------------ */
export async function POST(req, { params }) {
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
  }).select("role");
  if (!canManage(team, membership, me._id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const role = body.role;
  const isMinor = !!body.isMinor;

  // invitee names (child names if minor, optional for adults)
  const firstName = norm(body.firstName ?? body.inviteeFirstName ?? "");
  const lastName = norm(body.lastName ?? body.inviteeLastName ?? "");
=======
/**
 * POST: create (or re-create) an invite
 */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const { email, expiresInDays = 14 } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const normEmail = email.trim().toLowerCase();

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id user userId teamName"
    );
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // staff check
    const ownerId = String(team.user || team.userId || "");
    const isOwner = ownerId && ownerId === String(actor._id);
    const link = await TeamMember.findOne({
      teamId: team._id,
      userId: actor._id,
    })
      .select("role")
      .lean();
    if (!(isOwner || isStaffRole(link?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If already a member, reject re-invite.
    const existingMember = await TeamMember.findOne({
      teamId: team._id,
      role: { $ne: "pending" },
    })
      .populate({ path: "userId", select: "email" })
      .lean();

    if (existingMember?.userId?.email?.toLowerCase() === normEmail) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 409 }
      );
    }

    const now = new Date();
    const pending = await TeamInvitation.findOne({
      teamId: team._id, // ✅ FIXED
      email: normEmail,
      status: "pending",
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    });

    if (pending) {
      return NextResponse.json(
        { invite: pending, reused: true },
        { status: 200 }
      );
    }

    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
    );

    const newInvite = await TeamInvitation.create({
      teamId: team._id, // ✅ FIXED — REQUIRED BY SCHEMA
      email: normEmail,
      status: "pending",
      invitedBy: actor._id,
      createdAt: now,
      expiresAt,
    });
>>>>>>> local

  // email (for minors this is the parent/guardian email)
  const email = lower(body.email ?? body.parentEmail ?? "");

  const message = body.message?.slice(0, 1000) || "";

  /* ---------- validations ---------- */
  if (!["member", "coach", "manager"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  if (isMinor && (!firstName || !lastName)) {
    return NextResponse.json(
      { error: "Minor invites require first and last name" },
      { status: 400 }
    );
  }

  /* ---------- duplicate checks (aligned to your schema indexes) ---------- */
  // Adults: unique (teamId, email) where isMinor:false
  // Minors: unique (teamId, email, firstNameLower, lastNameLower) where isMinor:true
  const q = { teamId: team._id, email, isMinor };
  if (isMinor) {
    q.firstNameLower = lower(firstName);
    q.lastNameLower = lower(lastName);
  }
  const exists = await TeamInvitation.findOne(q).lean();
  if (exists) {
    return NextResponse.json(
      { error: "Duplicate invite already exists for this recipient." },
      { status: 409 }
    );
  }

  /* ---------- create ---------- */
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const invite = await TeamInvitation.create({
    teamId: team._id,
    email,
    isMinor,
    firstName: isMinor ? firstName : undefined,
    lastName: isMinor ? lastName : undefined,
    invitedByUserId: me._id,

    // keep everything in payload so the model does not need to change
    payload: { token, message, role, expiresAt },
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
  const childName =
    isMinor && (firstName || lastName)
      ? `${escapeHtml(firstName)} ${escapeHtml(lastName)}`.trim()
      : "";

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

  const html = baseEmailTemplate({
    title: `Invitation to join ${teamName}`,
    message: isMinor
      ? `
        <p>Hi Parent/Guardian,</p>
        <p><strong>${inviterName}</strong> invited your athlete
           <strong>${childName}</strong> to join <strong>${teamName}</strong> on MatScout.</p>
        ${ctaBtn}
        ${coachNote}
        <p style="font-size:12px;color:#666;margin-top:10px">This link expires in 14 days.</p>
      `
      : `
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> invited you to join <strong>${teamName}</strong> on MatScout.</p>
        ${ctaBtn}
        ${coachNote}
        <p style="font-size:12px;color:#666;margin-top:10px">This link expires in 14 days.</p>
      `,
  });

  await Mail.sendEmail({
    type: Mail.kinds.TEAM_INVITE,
    toEmail: email,
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
  }).select("role");

  if (!canManage(team, membership, me._id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Return all active invites (you can filter more if needed)
  const invites = await TeamInvitation.find({ teamId: team._id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ invites }, { status: 200 });
}
