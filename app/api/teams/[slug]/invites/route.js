export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamInvitation from "@/models/teamInvitationModel";

function isStaffRole(role) {
  return ["owner", "manager", "coach"].includes((role || "").toLowerCase());
}

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
      team: team._id,
      ...(allowed.includes(status) ? { status } : { status: "pending" }),
    };

    // IMPORTANT: no hidden date cutoffs
    const invites = await TeamInvitation.find(query)
      .sort({ createdAt: -1 })
      .select(
        "_id email status createdAt acceptedAt expiresAt invitedBy acceptedMember"
      );

    return NextResponse.json({ invites });
  } catch (err) {
    console.error("GET /invites error:", err);
    return NextResponse.json({ invites: [] }, { status: 200 });
  }
}

/**
 * POST: create (or re-create) an invite
 * Behavior:
 * - If the user is already an active member ⇒ 409 (don’t invite).
 * - If an existing PENDING invite exists for same email & not expired ⇒ return it (idempotent).
 * - If the invite is EXPIRED or REVOKED ⇒ create a NEW pending invite with a new expiry.
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

    // If already a member (non-pending), don’t allow a new invite.
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

    // Check for an existing pending invite (not expired)
    const now = new Date();
    const pending = await TeamInvitation.findOne({
      team: team._id,
      email: normEmail,
      status: "pending",
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
    });

    if (pending) {
      // Idempotent: return existing pending invite instead of creating duplicates
      return NextResponse.json(
        { invite: pending, reused: true },
        { status: 200 }
      );
    }

    // Create new pending invite. (Old expired/revoked invites remain as history.)
    const expiresAt = new Date(
      now.getTime() + expiresInDays * 24 * 60 * 60 * 1000
    );
    const newInvite = await TeamInvitation.create({
      team: team._id,
      email: normEmail,
      status: "pending",
      invitedBy: actor._id,
      createdAt: now,
      expiresAt,
    });

    return NextResponse.json(
      { invite: newInvite, reused: false },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /invites error:", err);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
