// app/api/teams/[slug]/coach-notes/bulk-encrypt/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";
import { getCurrentUser } from "@/lib/auth-server";
import { encryptCoachNoteBody, teamHasLock } from "@/lib/crypto/teamLock";

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

    // Only owner is allowed
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Ensure password + TBK are configured
    if (!teamHasLock(team)) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Team password not configured. Set a password before bulk-encrypting notes.",
        },
        { status: 400 }
      );
    }

    // Parse input
    const body = await req.json().catch(() => null);
    const notes = Array.isArray(body?.notes) ? body.notes : [];

    if (!notes.length) {
      return NextResponse.json(
        { ok: false, message: "No notes supplied for bulk encrypt." },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const raw of notes) {
      const idRaw = raw?._id || raw?.id;
      if (!idRaw) continue;
      const id = String(idRaw);

      const decrypted = raw?.decrypted || {};

      // Fetch the existing note
      const existing = await CoachMatchNote.findById(id).lean();
      if (!existing) continue;

      // Skip if already encrypted
      if (existing.crypto?.ciphertextB64) continue;

      // Build the sensitive payload
      const sensitivePayload = {
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

      // Encrypt
      const enc = await encryptCoachNoteBody(team, sensitivePayload);

      // Update DB
      const updateResult = await CoachMatchNote.updateOne(
        { _id: id, team: team._id },
        {
          $set: {
            crypto: enc.crypto,
            whatWentWell: "",
            reinforce: "",
            needsFix: "",
            notes: "",
            techniques: { ours: [], theirs: [] },
            result: "",
            score: "",
          },
        }
      );

      if (updateResult.modifiedCount > 0) {
        updatedCount++;
      }
    }

    if (!updatedCount) {
      return NextResponse.json(
        {
          ok: false,
          message: "No notes were encrypted.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: updatedCount,
        message: `Encrypted ${updatedCount} coach note(s).`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("bulk-encrypt coach-notes POST error:", err);
    return NextResponse.json(
      { ok: false, message: "Bulk encrypt failed." },
      { status: 500 }
    );
  }
}
