import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";

export const dynamic = "force-dynamic";

async function assertAdmin() {
  const me = await getCurrentUser();
  if (!me) return { status: 401, error: "Unauthorized" };
  const meDoc = await User.findById(me._id).select("isAdmin role").lean();
  const isAdmin = !!(meDoc?.isAdmin || meDoc?.role === "admin");
  if (!isAdmin) return { status: 403, error: "Forbidden" };
  return { ok: true };
}

function badId(id) {
  return !id || !isValidObjectId(id);
}

// PATCH: update role
export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const auth = await assertAdmin();
    if (!auth.ok)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { teamId, memberId } = await params;
    if (badId(teamId) || badId(memberId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nextRole = String(body.role || "")
      .toLowerCase()
      .trim();
    const allowed = new Set(["manager", "coach", "member", "pending"]);
    if (!allowed.has(nextRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const team = await Team.findById(teamId).select("_id").lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      _id: memberId,
      teamId: team._id,
    });
    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      );
    }

    membership.role = nextRole;
    await membership.save();

    return NextResponse.json({ ok: true, role: nextRole }, { status: 200 });
  } catch (err) {
    console.error("PATCH admin team member role failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE: remove member (kept for the Remove button)
export async function DELETE(_req, { params }) {
  try {
    await connectDB();
    const auth = await assertAdmin();
    if (!auth.ok)
      return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { teamId, memberId } = await params;
    if (badId(teamId) || badId(memberId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const team = await Team.findById(teamId).select("_id").lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const membership = await TeamMember.findOneAndDelete({
      _id: memberId,
      teamId: team._id,
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE admin team member failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
