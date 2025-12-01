// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/[matchId]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";
import { requireTeamRole, canDelete } from "@/lib/authz/teamRoles";

import {
  decryptCoachNoteBody,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

const NEEDS_PLUS_VIDEO = true;

/* =====================================================================================
   GET — supports decrypt=1
===================================================================================== */
export async function GET(req, ctx) {
  await connectDB();
  const { slug, matchId } = await ctx.params;

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const q = NEEDS_PLUS_VIDEO
    ? CoachMatchNote.findById(matchId).select("+video")
    : CoachMatchNote.findById(matchId);

  let match = await q.lean();
  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const url = new URL(req.url);
  const shouldDecrypt = url.searchParams.get("decrypt") === "1";

  if (shouldDecrypt) {
    const teamDoc = await Team.findById(gate.teamId).lean();
    if (!teamDoc)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const dec = await decryptCoachNoteBody(teamDoc, match);
    if (dec) {
      match.whatWentWell = dec.whatWentWell;
      match.reinforce = dec.reinforce;
      match.needsFix = dec.needsFix;
      match.notes = dec.notes;
      match.techniques = dec.techniques;
      match.result = dec.result;
      match.score = dec.score;
    }
  }

  return NextResponse.json({ match });
}

/* =====================================================================================
   PATCH — TBK encrypt → update note
===================================================================================== */
export async function PATCH(req, ctx) {
  await connectDB();
  const { slug, matchId } = await ctx.params;

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });

  const team = await Team.findById(gate.teamId).lean();
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const body = await req.json();

  const sensitive = {
    whatWentWell: body?.whatWentWell || "",
    reinforce: body?.reinforce || "",
    needsFix: body?.needsFix || "",
    notes: body?.notes || "",
    techniques: {
      ours: body?.techniques?.ours || [],
      theirs: body?.techniques?.theirs || [],
    },
    result: body?.result || "",
    score: body?.score || "",
  };

  const { body: encBody, crypto } = await encryptCoachNoteBody(team, sensitive);

  const $set = {
    "opponent.name": body?.opponent?.name ?? undefined,
    "opponent.rank": body?.opponent?.rank ?? undefined,
    "opponent.club": body?.opponent?.club ?? undefined,
    "opponent.country": body?.opponent?.country ?? undefined,

    whatWentWell: encBody.whatWentWell,
    reinforce: encBody.reinforce,
    needsFix: encBody.needsFix,
    notes: encBody.notes,
    "techniques.ours": encBody.techniques.ours,
    "techniques.theirs": encBody.techniques.theirs,
    result: encBody.result,
    score: encBody.score,
    crypto,
  };

  Object.keys($set).forEach((k) => $set[k] === undefined && delete $set[k]);

  const update = { $set };

  if (Object.prototype.hasOwnProperty.call(body, "video")) {
    if (body.video === null) {
      update.$unset = { ...(update.$unset || {}), video: "" };
    } else if (body.video && typeof body.video === "object") {
      update.$set.video = {
        url: body.video.url?.trim() || "",
        label: body.video.label?.trim() || "",
        startMs: Number.isFinite(body.video.startMs) ? body.video.startMs : 0,
      };
    }
  }

  const updated = await CoachMatchNote.findByIdAndUpdate(matchId, update, {
    new: true,
    runValidators: true,
  })
    .select(NEEDS_PLUS_VIDEO ? "+video" : undefined)
    .lean();

  if (!updated)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });

  return NextResponse.json({ match: updated });
}

/* =====================================================================================
   DELETE — soft delete a match
===================================================================================== */
export async function DELETE(req, ctx) {
  await connectDB();
  const { slug, entryId, matchId } = await ctx.params;

  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
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
