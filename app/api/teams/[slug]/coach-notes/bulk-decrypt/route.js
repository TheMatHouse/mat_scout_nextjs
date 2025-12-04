// app/api/teams/[slug]/coach-notes/bulk-decrypt/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import mongoose from "mongoose";

import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

export async function POST(req, context) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    // Normalized lookup
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

    // Only OWNER may decrypt
    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const notes = Array.isArray(body?.notes) ? body.notes : [];

    if (!notes.length) {
      return NextResponse.json(
        {
          ok: true,
          updatedCount: 0,
          message: "No notes provided for bulk decrypt.",
        },
        { status: 200 }
      );
    }

    let updatedCount = 0;
    let matchedCount = 0;

    for (const raw of notes) {
      const id = raw?._id || raw?.id;
      const decrypted = raw?.decrypted || {};

      if (!id) continue;
      const idStr = String(id);

      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        console.warn("Skipping invalid note ID:", idStr);
        continue;
      }

      // Build restore payload
      const $set = {
        whatWentWell: decrypted.whatWentWell || "",
        reinforce: decrypted.reinforce || "",
        needsFix: decrypted.needsFix || "",
        notes: decrypted.notes || "",
        result: decrypted.result || "",
        score: decrypted.score || "",
        techniques: {
          ours: Array.isArray(decrypted?.techniques?.ours)
            ? decrypted.techniques.ours
            : [],
          theirs: Array.isArray(decrypted?.techniques?.theirs)
            ? decrypted.techniques.theirs
            : [],
        },
      };

      const update = {
        $set,
        $unset: { crypto: "" }, // remove encryption block
      };

      const result = await CoachMatchNote.updateOne(
        { _id: idStr, team: team._id },
        update
      );

      matchedCount += result.matchedCount || 0;
      updatedCount += result.modifiedCount || 0;
    }

    return NextResponse.json(
      {
        ok: true,
        updatedCount,
        matchedCount,
        inputCount: notes.length,
        message: `Decrypted ${updatedCount} coach note(s).`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("bulk-decrypt coach-notes error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to bulk decrypt notes." },
      { status: 500 }
    );
  }
}
