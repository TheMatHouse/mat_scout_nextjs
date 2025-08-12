// app/api/teams/[slug]/updates/route.js
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
    .select("_id teamSlug teamName user")
    .lean();
  return team;
}

function isManagerOrCoach(membership, team, meId) {
  if (!membership && !team) return false;
  if (String(team.user) === String(meId)) return true; // owner
  const role = String(membership?.role || "").toLowerCase();
  return role === "manager" || role === "coach";
}

// GET /api/teams/[slug]/updates  -> list latest
export async function GET(_req, { params }) {
  try {
    const { slug } = await params;
    const team = await loadTeam(slug);
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const updates = await TeamUpdate.find({ teamId: team._id })
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName username email")
      .lean();

    return NextResponse.json({ updates }, { status: 200 });
  } catch (err) {
    console.error("GET updates failed:", err);
    return NextResponse.json(
      { error: "Failed to load updates" },
      { status: 500 }
    );
  }
}

// POST /api/teams/[slug]/updates  -> create new
export async function POST(req, { params }) {
  try {
    const me = await getCurrentUserFromCookies();
    if (!me)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await params;
    const team = await loadTeam(slug);
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
      familyMemberId: { $exists: false },
    }).select("role");

    if (!isManagerOrCoach(membership, team, me._id)) {
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

    const update = await TeamUpdate.create({
      teamId: team._id,
      title,
      body: text,
      createdBy: me._id,
      authorId: me._id, // back-compat
    });

    const populated = await TeamUpdate.findById(update._id)
      .populate("createdBy", "firstName lastName username email")
      .lean();

    return NextResponse.json({ update: populated }, { status: 201 });
  } catch (err) {
    console.error("POST update failed:", err);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}
