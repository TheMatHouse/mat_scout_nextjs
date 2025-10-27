import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

const clean = (v) => (typeof v === "string" ? v.trim() : "");
const asStringArray = (v) =>
  Array.isArray(v)
    ? v.map((s) => clean(s)).filter(Boolean)
    : String(v || "")
        .split(",")
        .map((s) => clean(s))
        .filter(Boolean);

async function gate(userId, slug) {
  await connectDB();
  const team = await Team.findOne({ teamSlug: slug }).select("_id user").lean();
  if (!team) return { ok: false, status: 404, reason: "Team not found" };
  if (!userId) return { ok: false, status: 401, reason: "Not signed in" };
  if (String(team.user) === String(userId))
    return { ok: true, teamId: team._id, role: "owner" };

  const m = await TeamMember.findOne({
    teamId: team._id,
    userId,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  const r = String(m?.role || "").toLowerCase();
  const allowed = ["manager", "owner", "admin", "coach"].includes(r);
  if (!allowed) return { ok: false, status: 403, reason: "Not a team member" };
  return { ok: true, teamId: team._id, role: r };
}

const isManagerLike = (role) => ["owner", "manager", "admin"].includes(role);

// ✅ entryId is NOT required; we find the match by team+event+matchId
async function assertMatch(teamId, eventId, matchId) {
  const match = await CoachMatchNote.findOne({
    _id: matchId,
    team: teamId,
    event: eventId,
    deletedAt: null,
  }).lean();

  if (!match) return { ok: false, status: 404, reason: "Match not found" };
  return { ok: true, match };
}

function normalizePatch(body = {}) {
  const patch = {};
  if (body.opponent) {
    patch.opponent = {
      name: clean(body.opponent.name),
      rank: clean(body.opponent.rank),
      club: clean(body.opponent.club),
      country: clean(body.opponent.country),
    };
  }
  if (typeof body.whatWentWell !== "undefined")
    patch.whatWentWell = clean(body.whatWentWell);
  if (typeof body.reinforce !== "undefined")
    patch.reinforce = clean(body.reinforce);
  if (typeof body.needsFix !== "undefined")
    patch.needsFix = clean(body.needsFix);
  if (body.techniques) {
    patch.techniques = {
      ours: asStringArray(body.techniques.ours).map((s) => s.toLowerCase()),
      theirs: asStringArray(body.techniques.theirs).map((s) => s.toLowerCase()),
    };
  }
  if (typeof body.result !== "undefined") patch.result = clean(body.result);
  if (typeof body.score !== "undefined") patch.score = clean(body.score);
  if (typeof body.notes !== "undefined") patch.notes = clean(body.notes);
  if (typeof body.videoUrl !== "undefined")
    patch.videoUrl = clean(body.videoUrl);
  return patch;
}

/* GET one match */
export async function GET(_req, { params }) {
  try {
    const { slug, eventId, matchId } = params;
    const me = await getCurrentUserFromCookies().catch(() => null);
    const g = await gate(me?._id, slug);
    if (!g.ok)
      return NextResponse.json({ error: g.reason }, { status: g.status });

    const check = await assertMatch(g.teamId, eventId, matchId);
    if (!check.ok)
      return NextResponse.json(
        { error: check.reason },
        { status: check.status }
      );

    return NextResponse.json({ match: check.match }, { status: 200 });
  } catch (e) {
    console.error("GET match error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* PATCH update match */
export async function PATCH(req, { params }) {
  try {
    const { slug, eventId, matchId } = params;
    const me = await getCurrentUserFromCookies().catch(() => null);
    const g = await gate(me?._id, slug);
    if (!g.ok)
      return NextResponse.json({ error: g.reason }, { status: g.status });

    const check = await assertMatch(g.teamId, eventId, matchId);
    if (!check.ok)
      return NextResponse.json(
        { error: check.reason },
        { status: check.status }
      );

    const canEdit =
      isManagerLike(g.role) ||
      String(check.match.createdBy || "") === String(me?._id || "");
    if (!canEdit)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const patch = normalizePatch(body);
    if (!Object.keys(patch).length)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    patch.updatedAt = new Date();
    patch.updatedBy = me?._id || null;

    await CoachMatchNote.updateOne(
      {
        _id: matchId,
        team: g.teamId,
        event: eventId,
        deletedAt: null,
      },
      { $set: patch }
    );

    return NextResponse.json(
      { ok: true, message: "Match updated" },
      { status: 200 }
    );
  } catch (e) {
    console.error("PATCH match error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* DELETE soft-delete match */
export async function DELETE(_req, { params }) {
  try {
    const { slug, eventId, entryId, matchId } = await params;
    const me = await getCurrentUserFromCookies().catch(() => null);
    const g = await gate(me?._id, slug);
    if (!g.ok)
      return NextResponse.json({ error: g.reason }, { status: g.status });

    await connectDB();

    const result = await CoachMatchNote.deleteOne({
      _id: matchId,
      team: g.teamId,
      event: eventId,
      entry: entryId,
    });

    if (result.deletedCount === 0) {
      console.warn("🟠 Nothing deleted:", { matchId, eventId, entryId });
      return NextResponse.json(
        { ok: false, message: "Note not found" },
        { status: 404 }
      );
    }

    console.log("✅ Hard-deleted note:", matchId);
    return NextResponse.json(
      { ok: true, message: "Note deleted permanently" },
      { status: 200 }
    );
  } catch (e) {
    console.error("DELETE match error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
