// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/route.js
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";

import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";
import { teamHasLock, encryptCoachNoteBody } from "@/lib/crypto/teamLock";

/* ========================================================================
   ROLE + FAMILY ACCESS
======================================================================== */
async function getUserAccess(slug) {
  await connectDB();

  const user = await getCurrentUser().catch(() => null);
  if (!user) return { role: "none", user: null, familyIds: [] };

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team) return { role: "none", user, familyIds: [] };

  // Owner = manager
  if (String(team.user) === String(user._id)) {
    return { role: "manager", user, familyIds: [] };
  }

  // Membership
  const mem = await TeamMember.findOne({
    teamId: team._id,
    userId: user._id,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  const role = mem?.role?.toLowerCase() ?? "none";

  // Family members
  const fam = await FamilyMember.find({ userId: user._id })
    .select("_id")
    .lean();
  const familyIds = fam.map((f) => String(f._id));

  return { role, user, familyIds };
}

/* ========================================================================
   GET — Member filtering (NO DECRYPT)
======================================================================== */
export async function GET(_, { params }) {
  await connectDB();
  const { slug, entryId } = await params;

  const { role, user, familyIds } = await getUserAccess(slug);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entry = await CoachEntry.findById(entryId).lean();
  if (!entry)
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const athlete = entry.athlete || {};
  const athleteUserId = athlete.user ? String(athlete.user) : null;
  const athleteFamilyId = athlete.familyMember
    ? String(athlete.familyMember)
    : null;

  const isManagerOrCoach = role === "manager" || role === "coach";

  if (!isManagerOrCoach) {
    const isSelf = athleteUserId === String(user._id);
    const isChild = athleteFamilyId && familyIds.includes(athleteFamilyId);

    if (!isSelf && !isChild) {
      return NextResponse.json(
        { error: "Forbidden (not your family)" },
        { status: 403 }
      );
    }
  }

  const notes = await CoachMatchNote.find({
    entry: entryId,
    team: entry.team,
    deletedAt: null,
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ notes });
}

/* ========================================================================
   POST — Create multiple match notes with TBK encryption
======================================================================== */
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { slug, eventId, entryId } = await params;

    const user = await getCurrentUser();
    const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);

    if (!gate.ok)
      return NextResponse.json({ error: gate.reason }, { status: gate.status });

    const entry = await CoachEntry.findOne({
      _id: entryId,
      team: gate.teamId,
      deletedAt: null,
    });

    if (!entry)
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const evt = await CoachEvent.findOne({
      _id: eventId,
      team: gate.teamId,
      deletedAt: null,
    });

    if (!evt)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const incomingNotes = Array.isArray(body?.notes) ? body.notes : [];

    if (!incomingNotes.length) {
      return NextResponse.json({ error: "No notes provided" }, { status: 400 });
    }

    const team = await Team.findById(gate.teamId).lean();
    const created = [];

    for (const n of incomingNotes) {
      const opponent = n.opponent || {
        name: "",
        rank: "",
        club: "",
        country: "",
      };

      const sensitivePayload = {
        whatWentWell: n.whatWentWell || "",
        reinforce: n.reinforce || "",
        needsFix: n.needsFix || "",
        notes: n.notes || "",
        techniques: n.techniques || { ours: [], theirs: [] },
        result: n.result || "",
        score: n.score || "",
      };

      const video = n.video
        ? {
            url: n.video.url || "",
            label: n.video.label || "",
            startMs: n.video.startMs || 0,
          }
        : {};

      let crypto = null;
      let storedFields = {};

      if (teamHasLock(team)) {
        const enc = await encryptCoachNoteBody(team, sensitivePayload);
        crypto = enc.crypto;

        storedFields = {
          whatWentWell: "",
          reinforce: "",
          needsFix: "",
          notes: "",
          techniques: { ours: [], theirs: [] },
          result: "",
          score: "",
        };
      } else {
        storedFields = sensitivePayload;
      }

      const doc = await CoachMatchNote.create({
        event: evt._id,
        entry: entry._id,
        team: gate.teamId,
        createdBy: user._id,
        athleteName: entry.athlete.name,
        opponent,
        video,
        crypto,
        ...storedFields,
      });

      created.push(doc.toObject());
    }

    return NextResponse.json({ notes: created });
  } catch (err) {
    console.error("💥 MATCHES POST ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ========================================================================
   DELETE — Soft delete
======================================================================== */
export async function DELETE(_, { params }) {
  await connectDB();
  const { slug, entryId, matchId } = await params;

  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!matchId)
    return NextResponse.json({ error: "matchId is required" }, { status: 400 });

  const gate = await requireTeamRole(user._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const note = await CoachMatchNote.findOne({
    _id: matchId,
    entry: entryId,
    team: gate.teamId,
    deletedAt: null,
  });

  if (!note)
    return NextResponse.json({ error: "Note not found" }, { status: 404 });

  if (!canDelete(gate.role, note.createdBy, user._id, "match"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  note.deletedAt = new Date();
  await note.save();

  return NextResponse.json({ ok: true });
}
