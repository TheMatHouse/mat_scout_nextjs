// app/api/teams/[slug]/updates/[updateId]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import TeamUpdate from "@/models/teamUpdateModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

async function loadTeam(slug) {
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug })
    .select("_id teamSlug user")
    .lean();
  return team;
}

function canEditOrDelete({ team, membership, update, meId }) {
  if (String(team.user) === String(meId)) return true; // owner
  const role = String(membership?.role || "").toLowerCase();
  if (role === "manager" || role === "coach") return true; // staff
  // Author can edit/delete
  const authorId = update.createdBy || update.authorId;
  return authorId && String(authorId) === String(meId);
}

// PATCH /api/teams/[slug]/updates/[updateId]
export async function PATCH(req, { params }) {
  try {
    const me = await getCurrentUserFromCookies();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, updateId } = await params;

    const team = await loadTeam(slug);
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const update = await TeamUpdate.findOne({
      _id: updateId,
      teamId: team._id,
    });
    if (!update)
      return NextResponse.json({ error: "Update not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
      familyMemberId: { $exists: false },
    }).select("role");

    if (!canEditOrDelete({ team, membership, update, meId: me._id })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    if (!title || !text) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    update.title = title;
    update.body = text;
    await update.save();

    const populated = await TeamUpdate.findById(update._id)
      .populate("createdBy", "firstName lastName username email")
      .lean();

    return NextResponse.json({ update: populated }, { status: 200 });
  } catch (err) {
    console.error("PATCH update failed:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/teams/[slug]/updates/[updateId]
export async function DELETE(_req, { params }) {
  try {
    const me = await getCurrentUserFromCookies();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug, updateId } = await params;

    const team = await loadTeam(slug);
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const update = await TeamUpdate.findOne({
      _id: updateId,
      teamId: team._id,
    });
    if (!update)
      return NextResponse.json({ error: "Update not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
      familyMemberId: { $exists: false },
    }).select("role");

    if (!canEditOrDelete({ team, membership, update, meId: me._id })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await update.deleteOne();
    return NextResponse.json(
      { ok: true, deletedId: updateId },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE update failed:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
