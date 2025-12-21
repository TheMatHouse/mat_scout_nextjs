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

/* ============================================================
   Helpers
============================================================ */

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
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
   POST — create OR re-activate invite
============================================================ */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { email, role = "member", expiresInDays = 14 } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();
    const safeRole = normalizeInviteRole(role);

    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id teamName user userId"
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

    /* ----------------------------------------------------------
       Block if user is already a team member (by email)
    ---------------------------------------------------------- */
    const existingMember = await TeamMember.findOne({
      teamId: team._id,
    })
      .populate({
        path: "userId",
        match: { email: normEmail },
        select: "email",
      })
      .lean();

    if (existingMember?.userId) {
      return NextResponse.json(
        { error: "User is already a team member" },
        { status: 409 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
    );

    /* ----------------------------------------------------------
       Find existing invite (any status)
    ---------------------------------------------------------- */
    let reused = false;

    let invite = await TeamInvitation.findOne({
      teamId: team._id,
      email: normEmail,
    });

    // Accepted is terminal
    if (invite?.status === "accepted") {
      return NextResponse.json(
        { error: "Invitation already accepted" },
        { status: 409 }
      );
    }

    if (invite) {
      // 🔁 Re-activate invite
      reused = true;
      invite.status = "pending";
      invite.expiresAt = expiresAt;
      invite.invitedByUserId = actor._id;
      invite.payload = {
        ...(invite.payload || {}),
        role: safeRole,
      };
      await invite.save();
    } else {
      // 🆕 Create new invite
      invite = await TeamInvitation.create({
        teamId: team._id,
        email: normEmail,
        status: "pending",
        expiresAt,
        invitedByUserId: actor._id,
        payload: { role: safeRole },
      });
    }

    /* ----------------------------------------------------------
       In-app notification (only if user exists)
    ---------------------------------------------------------- */
    const invitedUser = await User.findOne({ email: normEmail }).select("_id");
    if (invitedUser) {
      await createNotification({
        userId: invitedUser._id,
        type: "Team Invitation",
        body: `You were invited to join ${team.teamName}`,
        link: `/invites/${invite._id}`,
      });
    }

    /* ----------------------------------------------------------
       Email
    ---------------------------------------------------------- */
    const inviteUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invites/${invite._id}`;

    const html = baseEmailTemplate({
      title: "You’ve been invited to a team",
      message: `
        <p>You’ve been invited to join <strong>${team.teamName}</strong>.</p>
        <p>
          <a href="${inviteUrl}"
             style="display:inline-block;background:#1a73e8;color:#fff;
                    padding:10px 16px;border-radius:4px;text-decoration:none;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation expires on ${expiresAt.toLocaleDateString()}.</p>
      `,
    });

    await Mail.sendEmail({
      type: Mail.kinds.TEAM_INVITE,
      toEmail: normEmail,
      subject: `Invitation to join ${team.teamName}`,
      html,
      relatedUserId: actor._id,
      teamId: String(team._id),
    });

    return NextResponse.json({ invite, reused }, { status: 201 });
  } catch (err) {
    console.error("POST /invites error:", err);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
