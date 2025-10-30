// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/[matchId]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import CoachMatchNote from "@/models/coachMatchNoteModel"; // adjust if your file name differs
import { getCurrentUser } from "@/lib/auth-server"; // adjust if you use a different helper

// If your schema has `select: false` on video, keep this true:
const NEEDS_PLUS_VIDEO = true;

export async function GET(_req, ctx) {
  await connectDB();

  // 🔧 Next.js 15+: params must be awaited
  const { slug, eventId, entryId, matchId } = await ctx.params;

  // TODO: add your gate/permission check here if you have one
  // const me = await getCurrentUser().catch(() => null);
  // ... gate(me?._id, slug)

  const q = NEEDS_PLUS_VIDEO
    ? CoachMatchNote.findById(matchId).select("+video")
    : CoachMatchNote.findById(matchId);

  const match = await q.lean();
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json({ match });
}

export async function PATCH(req, ctx) {
  await connectDB();

  // 🔧 Next.js 15+: params must be awaited
  const { slug, eventId, entryId, matchId } = await ctx.params;

  // TODO: add your gate/permission check here if you have one
  // const me = await getCurrentUser().catch(() => null);
  // ... gate(me?._id, slug)

  const body = await req.json();

  // Build $set from allowed fields
  const $set = {
    "opponent.name": body?.opponent?.name ?? undefined,
    "opponent.rank": body?.opponent?.rank ?? undefined,
    "opponent.club": body?.opponent?.club ?? undefined,
    "opponent.country": body?.opponent?.country ?? undefined,

    whatWentWell: body?.whatWentWell ?? undefined,
    reinforce: body?.reinforce ?? undefined,
    needsFix: body?.needsFix ?? undefined,

    "techniques.ours": body?.techniques?.ours ?? undefined,
    "techniques.theirs": body?.techniques?.theirs ?? undefined,

    result: body?.result ?? undefined,
    score: body?.score ?? undefined,
    notes: body?.notes ?? undefined,
  };

  // Remove undefined keys so we don’t clobber fields
  Object.keys($set).forEach((k) => $set[k] === undefined && delete $set[k]);

  const update = { $set };
  // Video rules (mirror Add behavior):
  // - If body.video === null -> explicit clear
  // - If body.video is an object -> set/replace
  // - If body.video is undefined -> leave unchanged
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

  if (!updated) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  return NextResponse.json({ match: updated });
}
