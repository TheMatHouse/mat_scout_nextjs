// app/api/practice-notes/[id]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import PracticeNote from "@/models/practiceNoteModel";

function noStore(payload, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function toObjectIdString(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  // handle Mongoose ObjectId-ish objects
  try {
    return String(v);
  } catch {
    return "";
  }
}

/* ---------------- GET one ---------------- */
export async function GET(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) return noStore({ error: "Unauthorized" }, 401);

    const { id } = await context.params;

    const note = await PracticeNote.findOne({
      _id: id,
      user: user._id,
    }).lean();

    if (!note) return noStore({ error: "Not found" }, 404);

    // ensure plain serializable JSON for client
    const safeNote = JSON.parse(JSON.stringify(note));
    return noStore({ note: safeNote }, 200);
  } catch (err) {
    console.error("[practice-notes/[id] GET] error:", err);
    return noStore({ error: "Server error" }, 500);
  }
}

/* ---------------- PUT update ---------------- */
export async function PUT(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) return noStore({ error: "Unauthorized" }, 401);

    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));

    // IMPORTANT: accept both youtubeUrl and videoUrl from the client payload
    const itemsIn = Array.isArray(body?.items) ? body.items : [];

    const normalizedItems = itemsIn.map((i) => {
      const videoUrl =
        (typeof i?.videoUrl === "string" && i.videoUrl.trim()) ||
        (typeof i?.youtubeUrl === "string" && i.youtubeUrl.trim()) ||
        "";

      // timestamp can arrive as number or string; store as number or null
      let videoTimestamp = null;
      if (i?.videoTimestamp !== undefined && i?.videoTimestamp !== null) {
        const n = Number(i.videoTimestamp);
        videoTimestamp = Number.isFinite(n) ? n : null;
      }

      return {
        type: i?.type || "",
        title: i?.title || "",
        description: i?.description || "",
        externalInstructorName: i?.externalInstructorName || "",
        videoUrl,
        videoTimestamp,
        tags: Array.isArray(i?.tags) ? i.tags.filter(Boolean) : [],
      };
    });

    // ✅ NEW: validate and persist style
    const style =
      typeof body?.style === "string" ? body.style.trim().toLowerCase() : "";

    const allowed = new Set(["judo", "bjj", "wrestling"]);
    if (!allowed.has(style)) {
      return noStore(
        { error: "style is required and must be judo, bjj, or wrestling" },
        400
      );
    }

    const update = {
      startAt: body?.startAt ? new Date(body.startAt) : undefined,
      sessionType: body?.sessionType || undefined,
      style, // ✅ persist discipline
      items: normalizedItems,
      generalNotes: body?.generalNotes || "",
      externalClubName: body?.externalClubName || "",
    };

    // clubId may be null/undefined; only set club if present
    if (body?.clubId) {
      update.club = body.clubId;
      update.externalClubName = "";
    } else {
      update.club = undefined;
    }

    // clean undefined keys so we don't overwrite unintentionally
    Object.keys(update).forEach(
      (k) => update[k] === undefined && delete update[k]
    );

    const saved = await PracticeNote.findOneAndUpdate(
      { _id: id, user: user._id },
      { $set: update },
      { new: true }
    ).lean();

    if (!saved) return noStore({ error: "Not found" }, 404);

    const safeNote = JSON.parse(JSON.stringify(saved));
    return noStore({ note: safeNote }, 200);
  } catch (err) {
    console.error("[practice-notes/[id] PUT] error:", err);
    return noStore({ error: "Server error" }, 500);
  }
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user?._id) return noStore({ error: "Unauthorized" }, 401);

    const { id } = await context.params;

    const deleted = await PracticeNote.findOneAndDelete({
      _id: id,
      user: user._id,
    });

    if (!deleted) return noStore({ error: "Not found" }, 404);

    return noStore({ ok: true }, 200);
  } catch (err) {
    console.error("[practice-notes/[id] DELETE] error:", err);
    return noStore({ error: "Server error" }, 500);
  }
}
