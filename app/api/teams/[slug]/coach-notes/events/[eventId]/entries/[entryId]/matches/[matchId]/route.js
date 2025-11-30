// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/[matchId]/route.js

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
<<<<<<< Updated upstream
import CoachMatchNote from "@/models/coachMatchNoteModel";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";
import { requireTeamRole } from "@/lib/authz/teamRoles";

// TBK helpers
import {
  decryptCoachNoteBody,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";
=======
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import CoachEntry from "@/models/coachEntryModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import FamilyMember from "@/models/familyMemberModel";
>>>>>>> Stashed changes

const NEEDS_PLUS_VIDEO = true;

<<<<<<< Updated upstream
/* =====================================================================================
   GET — supports decrypt=1
===================================================================================== */
export async function GET(req, ctx) {
=======
/* ---------------------------------------------------------------------- */
/*  SHARED AUTH LOGIC (same rules everywhere)
    - Manager / Coach / Owner → full access
    - Member → may ONLY view matches for themselves or their children
    - No one else
/* ---------------------------------------------------------------------- */

async function resolveRole(team, userId) {
  if (!team || !userId) return { role: null };

  const isOwner = String(team.user) === String(userId);
  if (isOwner) return { role: "manager" }; // owner treated as manager

  const membership = await TeamMember.findOne({
    teamId: team._id,
    userId,
    familyMemberId: null,
  })
    .select("role")
    .lean();

  return { role: (membership?.role || "").toLowerCase() };
}

async function getKids(userId) {
  const kids = await FamilyMember.find({ userId }).select("_id").lean();
  return kids.map((k) => k._id.toString());
}

/* ---------------------------------------------------------------------- */
/*  GET — return one match
/* ---------------------------------------------------------------------- */
export async function GET(_req, ctx) {
>>>>>>> Stashed changes
  await connectDB();
  const { slug, matchId } = await ctx.params;

<<<<<<< Updated upstream
  const user = await getCurrentUser();
  const gate = await requireTeamRole(user?._id, slug, ["manager", "coach"]);
  if (!gate.ok)
    return NextResponse.json({ error: gate.reason }, { status: gate.status });
=======
  const { slug, eventId, entryId, matchId } = await ctx.params;

  const me = await getCurrentUserFromCookies().catch(() => null);
  if (!me?._id)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
>>>>>>> Stashed changes

  // Load team
  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  // Determine role
  const { role } = await resolveRole(team, me._id);
  const isManagerOrCoach = role === "manager" || role === "coach";

  // Load entry (to check athlete)
  const entry = await CoachEntry.findOne({
    _id: entryId,
    deletedAt: null,
  }).lean();
  if (!entry)
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  // MANAGER / COACH / OWNER → always allowed
  if (isManagerOrCoach) {
    const q = NEEDS_PLUS_VIDEO
      ? CoachMatchNote.findById(matchId).select("+video")
      : CoachMatchNote.findById(matchId);

    const match = await q.lean();
    if (!match)
      return NextResponse.json({ error: "Match not found" }, { status: 404 });

    return NextResponse.json({ match });
  }

  // MEMBER — allowed only if this entry belongs to them or their kids
  const kidIds = await getKids(me._id);

  const isSelf =
    entry.athlete?.user && String(entry.athlete.user) === String(me._id);

  const isChild =
    entry.athlete?.familyMember &&
    kidIds.includes(String(entry.athlete.familyMember));

  if (!isSelf && !isChild) {
    // Member is not allowed to view someone else's notes
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Load the match normally
  const q = NEEDS_PLUS_VIDEO
    ? CoachMatchNote.findById(matchId).select("+video")
    : CoachMatchNote.findById(matchId);

  const match = await q.lean();
  if (!match)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
<<<<<<< Updated upstream
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
=======
>>>>>>> Stashed changes

  return NextResponse.json({ match });
}

<<<<<<< Updated upstream
/* =====================================================================================
   PATCH — performs TBK encryption if team is locked
===================================================================================== */
=======
/* ---------------------------------------------------------------------- */
/*  PATCH — edit match
    Managers / Coaches / Owner ONLY
    Members cannot edit ANY match.
/* ---------------------------------------------------------------------- */

>>>>>>> Stashed changes
export async function PATCH(req, ctx) {
  await connectDB();
  const { slug, matchId } = await ctx.params;

<<<<<<< Updated upstream
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
=======
  const me = await getCurrentUserFromCookies().catch(() => null);
  if (!me?._id)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const team = await Team.findOne({ teamSlug: slug }).lean();
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const { role } = await resolveRole(team, me._id);
  const isManagerOrCoach = role === "manager" || role === "coach";

  if (!isManagerOrCoach)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json();

  // Build $set (same as original)
>>>>>>> Stashed changes
  const $set = {
    "opponent.name": body?.opponent?.name ?? undefined,
    "opponent.rank": body?.opponent?.rank ?? undefined,
    "opponent.club": body?.opponent?.club ?? undefined,
    "opponent.country": body?.opponent?.country ?? undefined,
<<<<<<< Updated upstream

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
=======
    whatWentWell: body?.whatWentWell ?? undefined,
    reinforce: body?.reinforce ?? undefined,
    needsFix: body?.needsFix ?? undefined,
    "techniques.ours": body?.techniques?.ours ?? undefined,
    "techniques.theirs": body?.techniques?.theirs ?? undefined,
    result: body?.result ?? undefined,
    score: body?.score ?? undefined,
    notes: body?.notes ?? undefined,
  };

  Object.keys($set).forEach((k) => $set[k] === undefined && delete $set[k]);

  const update = { $set };

>>>>>>> Stashed changes
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

  if (!updated)
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
<<<<<<< Updated upstream
  }
=======
>>>>>>> Stashed changes

  return NextResponse.json({ match: updated });
}
