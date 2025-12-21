export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";
import User from "@/models/userModel";

import { createNotification } from "@/lib/createNotification";
import Mail from "@/lib/email/mailer";
import { baseEmailTemplate } from "@/lib/email/templates/baseEmailTemplate";

function isStaffRole(role) {
  return ["owner", "manager", "coach"].includes((role || "").toLowerCase());
}

function normalizeInviteRole(role) {
  const r = (role || "member").toLowerCase();
  return ["manager", "coach", "member"].includes(r) ? r : "member";
}

/* ============================================================
   GET — list invites
============================================================ */
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

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "pending").toLowerCase();

    const invites = await TeamInvitation.find({
      teamId: team._id,
      status,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("GET /invites error:", err);
    return NextResponse.json({ invites: [] }, { status: 200 });
  }
}

/* ============================================================
   POST — create invite + notify
============================================================ */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const { email, role = "member", expiresInDays = 14 } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();
    const inviteRole = normalizeInviteRole(role);

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName user userId"
    );
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

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

    // Prevent inviting existing members
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

    // Reuse pending invite
    const pending = await TeamInvitation.findOne({
      teamId: team._id,
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

    const invite = await TeamInvitation.create({
      teamId: team._id,
      email: normEmail,
      role: inviteRole,
      status: "pending",
      invitedByUserId: actor._id,
      createdAt: now,
      expiresAt,
    });

    /* --------------------------------------------------------
       In-app notification (only if user already exists)
    -------------------------------------------------------- */
    try {
      const invitedUser = await User.findOne({ email: normEmail }).select(
        "_id"
      );

      if (invitedUser) {
        await createNotification({
          userId: invitedUser._id,
          type: "Team Invitation",
          body: `You were invited to join ${team.teamName} as ${inviteRole}`,
          link: `/invites/${invite._id}`,
        });
      }
    } catch (notifErr) {
      console.error("Invite in-app notification failed:", notifErr);
    }

    /* --------------------------------------------------------
       Email notification
    -------------------------------------------------------- */
    try {
      const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invites/${invite._id}`;

      const html = baseEmailTemplate({
        title: "You’ve been invited to a team",
        message: `
          <p>You’ve been invited to join <strong>${
            team.teamName
          }</strong> on MatScout.</p>
          <p><strong>Role:</strong> ${inviteRole}</p>
          <p>
            <a href="${inviteUrl}"
               style="display:inline-block;background-color:#1a73e8;color:white;
                      padding:10px 16px;border-radius:4px;text-decoration:none;
                      font-weight:bold;">
              Accept Invitation
            </a>
          </p>
          <p>This invitation expires on ${expiresAt.toLocaleDateString()}.</p>
        `,
      });

      await Mail.sendEmail({
        type: Mail.kinds.TEAM_INVITE,
        toEmail: normEmail,
        subject: `You’ve been invited to join ${team.teamName} on MatScout`,
        html,
        relatedUserId: actor._id,
        teamId: String(team._id),
      });
    } catch (emailErr) {
      console.error("Invite email failed:", emailErr);
    }

    return NextResponse.json({ invite, reused: false }, { status: 201 });
  } catch (err) {
    console.error("POST /invites error:", err);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
