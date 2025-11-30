// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/[matchId]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

// TBK helpers
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

  const q = NEEDS_PLUS_VIDEO
    ? CoachMatchNote.findById(matchId).select("+video")
    : CoachMatchNote.findById(matchId);

  const match = await q.lean();
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  // ----- decrypt if requested -----
  const url = new URL(req.url);
  if (url.searchParams.get("decrypt") === "1") {
    const team = await Team.findById(gate.teamId).lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // decrypt sensitive fields
    const dec = await decryptCoachNoteBody(team, match);
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
   PATCH — performs TBK encryption if team is locked
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

  // --------------------------------------------------------
  // 🔐 Extract ONLY the sensitive fields to encrypt
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 🔐 Encrypt (or passthrough if lock disabled)
  // --------------------------------------------------------
  const { body: encBody, crypto } = await encryptCoachNoteBody(team, sensitive);

  // --------------------------------------------------------
  // Build $set — same shape as previously, but using encBody
  // --------------------------------------------------------
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

    crypto, // null if no encryption, metadata if encrypted
  };

  Object.keys($set).forEach((key) => {
    if ($set[key] === undefined) delete $set[key];
  });

  const update = { $set };

  // --------------------------------------------------------
  // Video rules (unchanged)
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // Update in DB
  // --------------------------------------------------------
  const updated = await CoachMatchNote.findByIdAndUpdate(matchId, update, {
    new: true,
    runValidators: true,
  })
    .select(NEEDS_PLUS_VIDEO ? "+video" : undefined)
    .lean();

  if (!updated) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json({ match: updated });
}
