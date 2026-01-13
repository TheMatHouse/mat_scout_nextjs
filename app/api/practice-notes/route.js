// app/api/practice-notes/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import PracticeNote from "@/models/practiceNoteModel";

export const dynamic = "force-dynamic";

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */
function noStore(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeTimestamp(val) {
  // accept number, "123", null, etc.
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) {
    return Number(val);
  }
  return null;
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];

  return items.map((i) => {
    // accept BOTH: youtubeUrl (form), videoUrl (old), youtubeUrl in different shapes
    const videoUrl =
      (typeof i?.youtubeUrl === "string" && i.youtubeUrl) ||
      (typeof i?.videoUrl === "string" && i.videoUrl) ||
      (typeof i?.youtube === "string" && i.youtube) ||
      (typeof i?.url === "string" && i.url) ||
      "";

    // accept BOTH: videoTimestamp (form), timestamp (legacy)
    const videoTimestamp = normalizeTimestamp(
      i?.videoTimestamp ?? i?.timestamp ?? null
    );

    // accept BOTH: externalInstructorName (db), instructorName (UI)
    const externalInstructorName =
      (typeof i?.externalInstructorName === "string" &&
        i.externalInstructorName) ||
      (typeof i?.instructorName === "string" && i.instructorName) ||
      "";

    return {
      type: i?.type || "",
      title: i?.title || "",
      description: i?.description || "",

      // ✅ persist correctly
      videoUrl,
      videoTimestamp,

      // ✅ persist correctly
      instructor: null,
      externalInstructorName,

      tags: Array.isArray(i?.tags) ? i.tags : [],
    };
  });
}

/* -------------------------------------------------- */
/* GET                                                */
/* -------------------------------------------------- */
export async function GET() {
  await connectDB();

  const user = await getCurrentUser();
  if (!user?._id) {
    return noStore({ notes: [] });
  }

  const notes = await PracticeNote.find({ user: user._id })
    .sort({ startAt: -1 })
    .lean();

  return noStore({ notes });
}

/* -------------------------------------------------- */
/* POST (CREATE)                                      */
/* -------------------------------------------------- */
export async function POST(req) {
  await connectDB();

  const user = await getCurrentUser();
  if (!user?._id) {
    return noStore({ error: "Unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));

  // ✅ REQUIRE style so it's not silently "judo"
  const style =
    typeof body.style === "string" ? body.style.trim().toLowerCase() : "";

  const allowed = new Set(["judo", "bjj", "wrestling"]);
  if (!allowed.has(style)) {
    return noStore(
      {
        error: "style is required and must be one of: judo, bjj, wrestling",
        received: body.style ?? null,
      },
      400
    );
  }

  const note = await PracticeNote.create({
    user: user._id,
    startAt: body.startAt,
    sessionType: body.sessionType,

    // ✅ now guaranteed valid
    style,

    club: body.clubId || null,
    externalClubName: body.externalClubName || "",

    // ✅ robust mapping
    items: normalizeItems(body.items),

    generalNotes: body.generalNotes || "",
  });

  return noStore({ note });
}
