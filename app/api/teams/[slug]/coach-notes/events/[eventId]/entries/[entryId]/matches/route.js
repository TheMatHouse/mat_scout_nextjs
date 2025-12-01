// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";
import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";

import { teamHasLock, encryptCoachNoteBody } from "@/lib/crypto/teamLock";

/* ========================================================================
   GET — return ALL notes for an entry WITHOUT decrypting.
======================================================================== */
export async function GET(_, { params }) {
  await connectDB();
  const { slug, entryId } = await params;

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const entry = await CoachEntry.findOne({
    _id: entryId,
    team: gate.teamId,
    deletedAt: null,
  }).lean();

  if (!entry)
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const notes = await CoachMatchNote.find({
    entry: entry._id,
    deletedAt: null,
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({ notes });
}

/* ========================================================================
   POST — create coach notes (encrypt sensitive fields if team is locked)
======================================================================== */
export async function POST(request, { params }) {
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
    _id: eventId || entry.event,
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
    const opponent = {
      name: n.opponent?.name || "",
      rank: n.opponent?.rank || "",
      club: n.opponent?.club || "",
      country: n.opponent?.country || "",
    };

    const sensitivePayload = {
      whatWentWell: n?.whatWentWell || "",
      reinforce: n?.reinforce || "",
      needsFix: n?.needsFix || "",
      notes: n?.notes || "",
      techniques: {
        ours: Array.isArray(n?.techniques?.ours) ? n.techniques.ours : [],
        theirs: Array.isArray(n?.techniques?.theirs) ? n.techniques.theirs : [],
      },
      result: n?.result || "",
      score: n?.score || "",
    };

    const video = n?.videoRaw
      ? {
          url: n.videoRaw.url || "",
          label: n.videoRaw.label || "",
          startMs: parseTimestamp(n.videoRaw.start),
        }
      : {};

    // 🔐 ENCRYPT IF TEAM LOCKED
    let crypto = null;
    let saveFields = {};

    if (teamHasLock(team)) {
      const enc = await encryptCoachNoteBody(team, sensitivePayload);
      crypto = enc.crypto;

      // encrypted mode: encrypted content goes in crypto object, plaintext stays blank
      saveFields = {
        whatWentWell: "",
        reinforce: "",
        needsFix: "",
        notes: "",
        techniques: { ours: [], theirs: [] },
        result: "",
        score: "",
      };
    } else {
      // no encryption → save plaintext
      saveFields = sensitivePayload;
    }

    const noteDoc = await CoachMatchNote.create({
      event: evt._id,
      entry: entry._id,
      team: gate.teamId,
      createdBy: user._id,
      athleteName: entry.athlete.name,

      opponent,
      video,
      crypto,

      ...saveFields,
    });

    created.push(noteDoc.toObject());
  }

  return NextResponse.json({ notes: created });
}

function parseTimestamp(str = "") {
  if (!str) return 0;
  const [h, m, s] = str.split(":").map((v) => parseInt(v || "0", 10));
  return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
}

/* ========================================================================
   DELETE — soft delete
======================================================================== */
export async function DELETE(request, { params }) {
  await connectDB();
  const { slug, entryId } = await params;

  const id = new URL(request.url).searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id is required" }, { status: 400 });

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const note = await CoachMatchNote.findOne({
    _id: id,
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
