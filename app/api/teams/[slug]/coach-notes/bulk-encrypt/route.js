// app/api/teams/[slug]/coach-notes/bulk-encrypt/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel"; // adjust if your model name differs
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { params } = context;
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json(
        { ok: false, message: "Team not found" },
        { status: 404 }
      );
    }

    // Only team owner may bulk-encrypt coach notes
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const sec = team.security || {};
    const hasPassword =
      !!sec?.kdf?.saltB64 &&
      !!sec?.kdf?.iterations &&
      !!sec?.verifierB64 &&
      sec.lockEnabled;

    if (!hasPassword) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Team has no password configured. Set a password before bulk-encrypting.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const notesPayload = Array.isArray(body?.notes) ? body.notes : [];

    if (!notesPayload.length) {
      return NextResponse.json(
        { ok: false, message: "No notes provided." },
        { status: 400 }
      );
    }

    let updated = 0;

    for (const item of notesPayload) {
      const id = String(item._id || item.id);
      if (!id) continue;

      const note = await CoachMatchNote.findById(id).lean();
      if (!note) continue;

      // Already encrypted?
      if (note.crypto?.ciphertextB64) continue;

      // Client-side must provide a valid encrypted body
      if (!item.crypto || !item.crypto.ciphertextB64) {
        console.warn("[COACH BULK] Missing crypto for", id);
        continue;
      }

      // Update DB with ciphertext and wipe plaintext
      await CoachMatchNote.updateOne(
        { _id: id },
        {
          $set: {
            crypto: item.crypto,

            // wipe plaintext fields
            body: "",
          },
        }
      );

      updated++;
    }

    if (!updated) {
      return NextResponse.json(
        { ok: false, message: "No coach notes were encrypted." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: updated,
        message: `Encrypted ${updated} coach note(s).`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("coach-notes bulk-encrypt error:", err);
    return NextResponse.json(
      { ok: false, message: "Coach notes bulk encrypt failed." },
      { status: 500 }
    );
  }
}
