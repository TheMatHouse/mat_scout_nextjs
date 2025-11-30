<<<<<<< Updated upstream
// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/route.js

=======
>>>>>>> Stashed changes
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import CoachEntry from "@/models/coachEntryModel";
import CoachEvent from "@/models/coachEventModel";
import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";
import CoachMatchNote from "@/models/coachMatchNoteModel";
<<<<<<< Updated upstream
import Team from "@/models/teamModel";
=======
import FamilyMember from "@/models/familyMemberModel";
>>>>>>> Stashed changes

import {
  teamHasLock,
  encryptCoachNoteBody,
  decryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

<<<<<<< Updated upstream
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
=======
/* -------------------------------------------------------------------------- */
/*                                   GET                                      */
/* -------------------------------------------------------------------------- */
export async function GET(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    await connectDB();

    const me = await getCurrentUserFromCookies().catch(() => null);
    if (!me?._id) return NextResponse.json({ notes: [] });

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) return NextResponse.json({ notes: [] });

    const isOwner = String(team.user) === String(me._id);
    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
      familyMemberId: null,
    })
      .select("role")
      .lean();

    const role = isOwner ? "manager" : (membership?.role || "").toLowerCase();
    const isManagerOrCoach = role === "manager" || role === "coach";

    const entry = await CoachEntry.findOne({
      _id: entryId,
      deletedAt: null,
    }).lean();

    if (!entry) return NextResponse.json({ notes: [] });

    /* ---------------- Manager/Coach: see all notes ---------------- */
    if (isManagerOrCoach) {
      const notes = await CoachMatchNote.find({
        $or: [{ team: team._id }, { teamId: team._id }],
        $and: [
          { $or: [{ event: eventId }, { eventId }] },
          { $or: [{ entry: entryId }, { entryId }] },
        ],
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({ notes });
    }

    /* ---------------- Member: only self or children ---------------- */

    const kids = await FamilyMember.find({ userId: me._id })
      .select("_id")
      .lean();

    const kidIds = kids.map((k) => k._id.toString());

    const isSelf =
      entry.athlete?.user && String(entry.athlete.user) === String(me._id);

    const isChild =
      entry.athlete?.familyMember &&
      kidIds.includes(String(entry.athlete.familyMember));

    if (!isSelf && !isChild) {
      return NextResponse.json({ notes: [] });
    }

    const notes = await CoachMatchNote.find({
      $or: [{ team: team._id }, { teamId: team._id }],
      $and: [
        { $or: [{ event: eventId }, { eventId }] },
        { $or: [{ entry: entryId }, { entryId }] },
      ],
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes });
  } catch (err) {
    console.error("GET matches error:", err);
    return NextResponse.json({ notes: [] });
>>>>>>> Stashed changes
  }

<<<<<<< Updated upstream
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
=======
/* -------------------------------------------------------------------------- */
/*                                  POST                                      */
/* -------------------------------------------------------------------------- */
export async function POST(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    await connectDB();

    const me = await getCurrentUserFromCookies().catch(() => null);
    if (!me?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isOwner = String(team.user) === String(me._id);
    const membership = await TeamMember.findOne({
      teamId: team._id,
      userId: me._id,
      familyMemberId: null,
    })
      .select("role")
      .lean();

    const role = isOwner ? "manager" : (membership?.role || "").toLowerCase();
    const isManagerOrCoach = role === "manager" || role === "coach";

    if (!isManagerOrCoach) {
      return NextResponse.json(
        { error: "Not authorized to add match notes" },
        { status: 403 }
      );
    }

    const entry = await CoachEntry.findOne({
      _id: entryId,
      deletedAt: null,
    }).lean();

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const body = await req.json();
    const notesArray = Array.isArray(body.notes) ? body.notes : [];

    if (notesArray.length === 0) {
      return NextResponse.json({ error: "No notes provided" }, { status: 400 });
    }

    /* ---------------- Parse batch notes ---------------- */

    const toCreate = notesArray.map((n) => {
      // convert timestamp "H:M:S" → milliseconds
      let startMs = 0;
      if (n?.videoRaw?.start) {
        const [h, m, s] = (n.videoRaw.start || "0:0:0")
          .split(":")
          .map((v) => parseInt(v || "0", 10));
        startMs = (h * 3600 + m * 60 + s) * 1000;
      }

      return {
        team: team._id,
        event: eventId,
        entry: entryId,

        athleteName: entry.athlete?.name || "Unknown",

        opponent: {
          name: n.opponent?.name || n.opponentName || "",
          rank: n.opponent?.rank || n.opponentRank || "",
          club: n.opponent?.club || n.opponentClub || "",
          country: n.opponent?.country || n.opponentCountry || "",
        },

        whatWentWell: n.whatWentWell || "",
        reinforce: n.reinforce || "",
        needsFix: n.needsFix || "",
        techniques: {
          ours: n.techniques?.ours || n.techOurs?.map((t) => t.label) || [],
          theirs:
            n.techniques?.theirs || n.techTheirs?.map((t) => t.label) || [],
        },

        result: n.result || "",
        score: n.score || "",
        notes: n.notes || "",

        video: {
          url: n.videoRaw?.url || n.videoUrlRaw || "",
          label: n.videoRaw?.label || n.videoTitle || "",
          startMs,
        },

        createdBy: me._id,
      };
    });

    /* ---------------- Create all at once ---------------- */
    const created = await CoachMatchNote.insertMany(toCreate);

    return NextResponse.json({ notes: created }, { status: 201 });
  } catch (err) {
    console.error("POST matches error:", err);
    return NextResponse.json(
      { error: "Failed to create match note" },
      { status: 500 }
    );
>>>>>>> Stashed changes
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
