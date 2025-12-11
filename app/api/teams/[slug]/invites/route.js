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

/* ============================================================
   GET — list invites (pending by default)
============================================================ */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;

    // ✅ FIX: Correct team lookup using teamSlug
    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id user userId teamName"
    );
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // staff / owner check
    const ownerId = String(team.user || team.userId || "");
    const isOwner = ownerId === String(actor._id);

    const membership = await TeamMember.findOne({
      teamId: team._id, // ✅ FIXED field
      userId: actor._id, // ✅ FIXED field
    })
      .select("role")
      .lean();

    if (!(isOwner || isStaffRole(membership?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get("status") || "pending").toLowerCase();
    const allowed = ["pending", "accepted", "revoked", "expired"];

    // ALWAYS use teamId (correct field)
    const query = {
      teamId: team._id,
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
  }
}

/* ============================================================
   POST — create (or reuse) an invite
============================================================ */
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

    // ✅ FIX: Correct lookup
    const team = await Team.findOne({ teamSlug: slug }).select(
      "_id user userId teamName"
    );
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // staff / owner check
    const ownerId = String(team.user || team.userId || "");
    const isOwner = ownerId === String(actor._id);

    const membership = await TeamMember.findOne({
      teamId: team._id, // FIXED
      userId: actor._id, // FIXED
    })
      .select("role")
      .lean();

    if (!(isOwner || isStaffRole(membership?.role))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for existing member
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

    // Reuse pending invite if still valid
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

    const newInvite = await TeamInvitation.create({
      teamId: team._id, // FIXED
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
