// app/api/teams/[slug]/coach-notes/events/[eventId]/entries/[entryId]/matches/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import CoachEvent from "@/models/coachEventModel";
import CoachEntry from "@/models/coachEntryModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* --------------------- helpers: youtube & timecode --------------------- */
function timecodeToMs(tc = "") {
  const parts = String(tc)
    .trim()
    .split(":")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return 0;
  let s = 0;
  if (parts.length === 1) s = Number(parts[0] || 0);
  else if (parts.length === 2)
    s = Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
  else if (parts.length === 3)
    s =
      Number(parts[0] || 0) * 3600 +
      Number(parts[1] || 0) * 60 +
      Number(parts[2] || 0);
  return Number.isFinite(s) && s > 0 ? Math.round(s * 1000) : 0;
}

function parseSecondsFromQueryVal(val = "") {
  // supports "90", "90s", "1m30s"
  const t = String(val).trim();
  if (!t) return 0;
  if (/m|s/i.test(t)) {
    const m = Number(t.match(/(\d+)m/i)?.[1] ?? 0);
    const s = Number(t.match(/(\d+)s/i)?.[1] ?? 0);
    const total = m * 60 + s;
    return Number.isFinite(total) && total > 0 ? total : 0;
  }
  const num = Number(t);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function extractYouTubeId(url = "") {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (!/(youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(u)) return null;
  const re =
    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i;
  const m = u.match(re);
  return m ? m[1] : null;
}

function toNoCookieEmbedUrl(videoId, startSeconds = 0) {
  const base = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return startSeconds > 0 ? `${base}?start=${startSeconds}` : base;
}

function normalizeVideoFromRaw(raw) {
  // raw: { url, start, label }
  const rawUrl = typeof raw?.url === "string" ? raw.url.trim() : "";
  const rawStart = typeof raw?.start === "string" ? raw.start.trim() : "";
  const label = typeof raw?.label === "string" ? raw.label.trim() : "";

  if (!rawUrl) return {};

  const id = extractYouTubeId(rawUrl);
  if (!id) return {};

  // UI time wins; if absent, try URL query (?t= or ?start=)
  let ms = timecodeToMs(rawStart);
  if (!ms) {
    try {
      const u = new URL(rawUrl);
      const tParam = u.searchParams.get("t") || u.searchParams.get("start");
      if (tParam) {
        const sec = parseSecondsFromQueryVal(tParam);
        if (sec > 0) ms = sec * 1000;
      }
    } catch {
      // ignore URL parse errors
    }
  }
  const startSeconds = Math.round((ms || 0) / 1000);
  return {
    url: toNoCookieEmbedUrl(id, startSeconds),
    publicId: null,
    startMs: ms || 0,
    label,
    width: null,
    height: null,
    duration: null,
  };
}

/* ---------------------  GET: list all matches --------------------- */
export async function GET(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    await connectDB();

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) return NextResponse.json({ notes: [] });

    const notes = await CoachMatchNote.find({
      // tolerate both field names in existing data
      $or: [{ team: team._id }, { teamId: team._id }],
      $and: [
        { $or: [{ event: eventId }, { eventId }] },
        { $or: [{ entry: entryId }, { entryId }] },
      ],
      deleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes: notes || [] });
  } catch (err) {
    console.error("GET matches error:", err);
    return NextResponse.json({ notes: [] });
  }
}

/* ---------------------  POST: add match(es) --------------------- */
export async function POST(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    console.log("[POST /matches] start", { slug, eventId, entryId });

    await connectDB();

    const me = await getCurrentUserFromCookies().catch(() => null);
    if (!me?._id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    // --- Team
    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team)
      return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const isOwner = String(team.user) === String(me._id);
    const membership = await TeamMember.findOne({
      teamId: team._id,
      $or: [{ userId: me._id }, { familyMemberId: me._id }],
    }).lean();
    const role = (membership?.role || "").toLowerCase();
    const canWrite = isOwner || ["manager", "admin", "coach"].includes(role);
    if (!canWrite)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    // --- Event (tolerate team/teamId)
    const event = await CoachEvent.findOne({
      _id: eventId,
      $or: [{ team: team._id }, { teamId: team._id }],
    }).lean();
    if (!event) {
      console.error("[POST /matches] Event not found", {
        eventId,
        teamId: team._id,
      });
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // --- Entry (tolerate event/eventId and team/teamId)
    const entry = await CoachEntry.findOne({
      _id: entryId,
      $and: [
        { $or: [{ event: event._id }, { eventId: event._id }, { eventId }] },
        { $or: [{ team: team._id }, { teamId: team._id }] },
      ],
    }).lean();
    if (!entry) {
      console.error("[POST /matches] Entry not found", {
        entryId,
        eventObjectId: event._id,
        eventIdParam: eventId,
        teamId: team._id,
      });
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // --- Athlete info (be flexible)
    const athleteId = entry.athlete?.athleteId || entry.athleteId || null;
    const athleteName =
      entry.athlete?.name ||
      entry.athleteName ||
      entry.athlete?.displayName ||
      entry.athlete?.fullName ||
      entry.name ||
      null;

    if (!athleteName) {
      console.error("[POST /matches] Entry missing athleteName", { entryId });
      return NextResponse.json(
        { error: "Entry missing athleteName" },
        { status: 400 }
      );
    }

    // --- Parse body (allow single, array, or {notes:[...]})
    const raw = await req.json().catch(() => ({}));

    const normalize = (obj) => {
      // --- normalize video from obj.videoRaw (optional)
      const video =
        obj?.videoRaw && typeof obj.videoRaw === "object"
          ? normalizeVideoFromRaw(obj.videoRaw)
          : {};

      return {
        // write BOTH field names to satisfy either schema
        team: team._id,
        teamId: team._id,

        event: event._id,
        eventId, // keep the param too, if your schema stored string id

        entry: entry._id,
        entryId: entryId,

        athleteId: athleteId || null,
        athleteName,

        opponent: {
          name: obj?.opponent?.name || "",
          rank: obj?.opponent?.rank || "",
          club: obj?.opponent?.club || "",
          country: obj?.opponent?.country || "",
        },
        whatWentWell: obj?.whatWentWell || "",
        reinforce: obj?.reinforce || "",
        needsFix: obj?.needsFix || "",
        techniques: {
          ours: Array.isArray(obj?.techniques?.ours) ? obj.techniques.ours : [],
          theirs: Array.isArray(obj?.techniques?.theirs)
            ? obj.techniques.theirs
            : [],
        },
        result: obj?.result || "",
        score: obj?.score || "",
        notes: obj?.notes || "",

        // NEW: normalized YouTube video (empty object if none/invalid)
        video,

        deleted: false,
        createdBy: me._id,
      };
    };

    const docsPayload = Array.isArray(raw)
      ? raw.map(normalize)
      : Array.isArray(raw?.notes)
      ? raw.notes.map(normalize)
      : [normalize(raw)];

    console.log("[POST /matches] inserting", docsPayload.length, "note(s)");
    const created = await CoachMatchNote.insertMany(docsPayload);

    return NextResponse.json(
      { message: "Saved", notes: created },
      { status: 201 }
    );
  } catch (e) {
    console.error("[POST /matches] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------------  PATCH: edit one match --------------------- */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const matchId = body?._id;
    if (!matchId)
      return NextResponse.json({ error: "Missing match ID" }, { status: 400 });

    await connectDB();

    // If client sends videoRaw on edit, normalize it here
    let update = { ...body, updatedAt: new Date() };
    delete update._id;

    if (update.videoRaw && typeof update.videoRaw === "object") {
      update.video = normalizeVideoFromRaw(update.videoRaw);
      delete update.videoRaw;
    }

    const updated = await CoachMatchNote.findByIdAndUpdate(
      matchId,
      { $set: update },
      { new: true }
    );
    return NextResponse.json({ message: "Updated", note: updated });
  } catch (err) {
    console.error("PATCH match error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/* ---------------------  DELETE: soft delete --------------------- */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { matchId } = body || {};
    if (!matchId)
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });

    await connectDB();

    const deleted = await CoachMatchNote.findByIdAndUpdate(matchId, {
      deleted: true,
      deletedAt: new Date(),
    });

    return NextResponse.json({ message: "Deleted", note: deleted });
  } catch (err) {
    console.error("DELETE match error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
