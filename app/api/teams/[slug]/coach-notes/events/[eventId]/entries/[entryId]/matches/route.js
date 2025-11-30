// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";

import {
  teamHasLock,
  encryptCoachNoteBody,
  decryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

/* ========================================================================
   GET — return ALL notes for an entry, decrypting each if needed
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

  // Load full team for decryption
  const team = await Team.findById(gate.teamId).lean();

  const decrypted = [];
  for (const raw of notes) {
    if (raw?.crypto?.ciphertextB64) {
      const body = await decryptCoachNoteBody(team, raw);
      decrypted.push({ ...raw, ...body });
    } else {
      decrypted.push(raw);
    }
  }

  return NextResponse.json({ notes: decrypted });
}

/* ========================================================================
   POST — create 1 or multiple coach notes, encrypting if team is locked
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

  const incomingNotes = Array.isArray(body?.notes)
    ? body.notes
    : body && Object.keys(body).length
    ? [body]
    : [];

  if (!incomingNotes.length) {
    return NextResponse.json({ error: "No notes provided" }, { status: 400 });
  }

  // Load full team doc for encryption
  const team = await Team.findById(gate.teamId).lean();

  const created = [];

  for (const n of incomingNotes) {
    /* ----------------------------------------
       Opponent (always plaintext)
    ---------------------------------------- */
    const opponent = n?.opponent || {
      name: "",
      rank: "",
      club: "",
      country: "",
    };

    /* ----------------------------------------
       Video normalization
    ---------------------------------------- */
    let video = {};
    if (n?.video) {
      video = n.video;
    } else if (n?.videoRaw) {
      const raw = n.videoRaw;
      video = {
        url: raw.url || "",
        publicId: raw.publicId || null,
        label: raw.label || "",
        startMs: 0,
        width: null,
        height: null,
        duration: null,
      };
    }

    /* ----------------------------------------
       Sensitive payload to encrypt
    ---------------------------------------- */
    const sensitiveBody = {
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

    /* ----------------------------------------
       Encrypt or store plaintext
    ---------------------------------------- */
    let stored = {};
    if (teamHasLock(team)) {
      const { body: blank, crypto } = await encryptCoachNoteBody(
        team,
        sensitiveBody
      );
      stored = {
        whatWentWell: blank.whatWentWell,
        reinforce: blank.reinforce,
        needsFix: blank.needsFix,
        notes: blank.notes,
        techniques: blank.techniques,
        result: blank.result,
        score: blank.score,
        video,
        opponent,
        crypto,
      };
    } else {
      stored = {
        whatWentWell: sensitiveBody.whatWentWell,
        reinforce: sensitiveBody.reinforce,
        needsFix: sensitiveBody.needsFix,
        notes: sensitiveBody.notes,
        techniques: sensitiveBody.techniques,
        result: sensitiveBody.result,
        score: sensitiveBody.score,
        video,
        opponent,
        crypto: null,
      };
    }

    /* ----------------------------------------
       Create document
    ---------------------------------------- */
    const noteDoc = await CoachMatchNote.create({
      event: evt._id,
      entry: entry._id,
      team: gate.teamId,
      athleteName: entry.athlete.name,
      createdBy: user._id,
      ...stored,
    });

    created.push(noteDoc.toObject());
  }

  return NextResponse.json({ notes: created });
}

/* ========================================================================
   DELETE — soft delete a match note
======================================================================== */
export async function DELETE(request, { params }) {
  await connectDB();
  const { slug, entryId } = await params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

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
