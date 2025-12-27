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

/* --------------------- helpers --------------------- */
function normalizeVideoFromRaw(raw) {
  const rawUrl = typeof raw?.url === "string" ? raw.url.trim() : "";
  const rawStart = typeof raw?.start === "string" ? raw.start.trim() : "";
  const label = typeof raw?.label === "string" ? raw.label.trim() : "";

  if (!rawUrl) return {};

  const extractYouTubeId = (url) => {
    if (!/(youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url))
      return null;
    const re =
      /(?:youtube\.com\/.*[?&]v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&?/]+)/i;
    const m = url.match(re);
    return m ? m[1] : null;
  };

  const id = extractYouTubeId(rawUrl);
  if (!id) return {};

  let startSeconds = 0;
  if (rawStart) {
    const parts = rawStart.split(":").map(Number);
    if (parts.length === 2) startSeconds = parts[0] * 60 + parts[1];
    if (parts.length === 3)
      startSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return {
    url: `https://www.youtube-nocookie.com/embed/${id}${
      startSeconds ? `?start=${startSeconds}` : ""
    }`,
    publicId: null,
    startMs: startSeconds * 1000,
    label,
    width: null,
    height: null,
    duration: null,
  };
}

/* --------------------- GET --------------------- */
export async function GET(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    await connectDB();

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) return NextResponse.json({ notes: [] });

    const notes = await CoachMatchNote.find({
      team: team._id,
      event: eventId,
      entry: entryId,
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ notes: notes || [] });
  } catch (err) {
    console.error("GET matches error:", err);
    return NextResponse.json({ notes: [] });
  }
}

/* --------------------- POST --------------------- */
export async function POST(req, { params }) {
  try {
    const { slug, eventId, entryId } = await params;
    await connectDB();

    const me = await getCurrentUserFromCookies().catch(() => null);
    if (!me?._id) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isOwner = String(team.user) === String(me._id);
    const membership = await TeamMember.findOne({
      teamId: team._id,
      $or: [{ userId: me._id }, { familyMemberId: me._id }],
    }).lean();

    const role = (membership?.role || "").toLowerCase();
    const canWrite = isOwner || ["manager", "admin", "coach"].includes(role);
    if (!canWrite) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const event = await CoachEvent.findOne({
      _id: eventId,
      team: team._id,
    }).lean();
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const entry = await CoachEntry.findOne({
      _id: entryId,
      event: event._id,
      team: team._id,
    }).lean();
    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const athleteUserId = entry.athlete?.user || entry.athlete?.userId || null;
    const athleteFamilyId =
      entry.athlete?.familyMember || entry.athlete?.familyMemberId || null;

    if (!athleteUserId && !athleteFamilyId) {
      return NextResponse.json(
        { error: "Entry is missing athlete identity" },
        { status: 400 }
      );
    }

    const athleteId = athleteUserId || athleteFamilyId;
    const athleteType = athleteUserId ? "user" : "family";
    const athleteName = entry.athlete?.name;

    const raw = await req.json().catch(() => ({}));

    const noteObjects = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.notes)
      ? raw.notes
      : [raw];

    const docsPayload = noteObjects.map((obj) => {
      const h = Math.max(0, parseInt(obj?.videoH || "0", 10) || 0);
      const m = Math.max(0, parseInt(obj?.videoM || "0", 10) || 0);
      const s = Math.max(0, parseInt(obj?.videoS || "0", 10) || 0);
      const startMs = (h * 3600 + m * 60 + s) * 1000;

      const videoUrl = String(obj?.videoUrlRaw || "").trim();

      return {
        team: team._id,
        event: event._id,
        entry: entry._id,

        athleteId,
        athleteType,
        athleteName,

        opponent: {
          name: obj?.opponentName || "",
          rank: obj?.opponentRank || "",
          club: obj?.opponentClub || "",
          country: obj?.opponentCountry || "",
        },

        whatWentWell: obj?.whatWentWell || "",
        reinforce: obj?.reinforce || "",
        needsFix: obj?.needsFix || "",

        techniques: {
          ours: Array.isArray(obj?.techOurs)
            ? obj.techOurs
                .map((t) => String(t?.label || "").trim())
                .filter(Boolean)
            : [],
          theirs: Array.isArray(obj?.techTheirs)
            ? obj.techTheirs
                .map((t) => String(t?.label || "").trim())
                .filter(Boolean)
            : [],
        },

        result: obj?.result || "",
        score: obj?.score || "",
        notes: obj?.notes || "",

        video: videoUrl
          ? {
              url: videoUrl,
              label: String(obj?.videoTitle || "").trim(),
              startMs,
            }
          : {},

        createdBy: me._id,
      };
    });

    const created = await CoachMatchNote.insertMany(docsPayload);

    return NextResponse.json(
      { message: "Saved", notes: created },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /matches] error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* --------------------- PATCH --------------------- */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const matchId = body?._id;
    if (!matchId)
      return NextResponse.json({ error: "Missing match ID" }, { status: 400 });

    await connectDB();

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* --------------------- DELETE --------------------- */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { matchId } = body || {};
    if (!matchId)
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });

    await connectDB();

    const deleted = await CoachMatchNote.findByIdAndUpdate(matchId, {
      deletedAt: new Date(),
    });

    return NextResponse.json({ message: "Deleted", note: deleted });
  } catch (err) {
    console.error("DELETE match error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
