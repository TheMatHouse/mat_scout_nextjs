// app/api/teams/[slug]/security/setup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

import { encryptCoachNoteBody, teamHasLock } from "@/lib/crypto/teamLock"; // SAME helper used by new-note creation

export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Normalize slug
    const slug = decodeURIComponent(
      String((await params).slug || "")
    ).toLowerCase();

    // Parse body
    const body = await req.json().catch(() => ({}));
    const saltB64 = body?.kdf?.saltB64?.trim();
    const iterations = Number(body?.kdf?.iterations ?? 0);
    const verifierB64 = body?.verifierB64?.trim();

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        { message: "Missing { kdf: { saltB64, iterations }, verifierB64 }." },
        { status: 400 }
      );
    }

    // Load team
    const teamDoc = await Team.findOne({ teamSlug: slug })
      .select("_id user teamSlug security")
      .lean();

    if (!teamDoc) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // ================
    // UPDATE SECURITY
    // ================
    const db = mongoose.connection.db;
    const col = db.collection("teams");

    const update = {
      $set: {
        "security.lockEnabled": true,
        "security.encVersion": "v1",
        "security.kdf.saltB64": saltB64,
        "security.kdf.iterations": iterations,
        "security.verifierB64": verifierB64,
      },
    };

    const writeResult = await col.updateOne({ _id: teamDoc._id }, update);

    // Now reload fresh doc (raw)
    const fresh = await col.findOne(
      { _id: teamDoc._id },
      { projection: { _id: 1, teamSlug: 1, security: 1 } }
    );

    // If security isn't present → fail
    if (!fresh?.security?.lockEnabled) {
      return NextResponse.json(
        {
          message: "Team lock initialized, but security block missing.",
          writeStats: writeResult,
          team: fresh,
        },
        { status: 500 }
      );
    }

    // ======================================================
    // 🔥 AUTO-ENCRYPT ALL EXISTING COACH MATCH NOTES HERE
    // ======================================================
    const teamId = String(teamDoc._id);

    const existingNotes = await CoachMatchNote.find({
      team: teamId,
      crypto: { $exists: false }, // plaintext only
      deletedAt: null,
    }).lean();

    let encryptedCount = 0;

    if (existingNotes.length > 0) {
      // Load updated team with full security block for encryption
      const fullTeam = {
        _id: teamId,
        security: fresh.security,
      };

      for (const n of existingNotes) {
        try {
          const payload = {
            whatWentWell: n.whatWentWell || "",
            reinforce: n.reinforce || "",
            needsFix: n.needsFix || "",
            notes: n.notes || "",
            techniques: n.techniques || { ours: [], theirs: [] },
            result: n.result || "",
            score: n.score || "",
          };

          const enc = await encryptCoachNoteBody(fullTeam, payload);

          await CoachMatchNote.updateOne(
            { _id: n._id },
            {
              $set: {
                crypto: enc.crypto,

                // blank plaintext fields
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

          encryptedCount++;
        } catch (err) {
          console.error("[AUTO-ENCRYPT] Failed coach note:", n?._id, err);
        }
      }
    }

    // ==========================
    // API RESPONSE
    // ==========================
    const connInfo = {
      dbName: mongoose.connection.name || null,
      host:
        (mongoose.connection.hosts && mongoose.connection.hosts[0]?.host) ||
        mongoose.connection.host ||
        null,
      port:
        (mongoose.connection.hosts && mongoose.connection.hosts[0]?.port) ||
        mongoose.connection.port ||
        null,
    };

    return NextResponse.json(
      {
        message: "Team lock initialized; existing Coach Notes encrypted.",
        encryptedCoachNotes: encryptedCount,
        totalExistingNotes: existingNotes.length,
        connection: connInfo,
        writeStats: writeResult,
        team: {
          _id: String(fresh?._id),
          teamSlug: fresh?.teamSlug,
          security: fresh?.security,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("security/setup POST error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
