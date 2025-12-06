// app/api/teams/[slug]/security/setup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

import { encryptCoachNoteBody } from "@/lib/crypto/teamLock";

// -----------------------------------------------------
// 🔐 Helpers to generate & wrap the Team Box Key (TBK)
// -----------------------------------------------------
async function deriveKeyFromPasswordBytes(
  passwordBytes,
  saltBytes,
  iterations
) {
  return crypto.subtle
    .importKey("raw", passwordBytes, { name: "PBKDF2" }, false, ["deriveKey"])
    .then((keyMaterial) =>
      crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: saltBytes,
          iterations,
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      )
    );
}

function b64ToBytes(b64) {
  const bin = Buffer.from(b64, "base64");
  return new Uint8Array(bin);
}

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString("base64");
}
// -----------------------------------------------------

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

    const db = mongoose.connection.db;
    const col = db.collection("teams");

    // ========================================================
    // 🔐 STEP 1: CREATE & WRAP TEAM BOX KEY (TBK)
    // ========================================================
    const tbk = crypto.getRandomValues(new Uint8Array(32)); // raw 256-bit key
    const saltBytes = b64ToBytes(saltB64);

    // For wrapping, derive AES-GCM key from password-derived bytes:
    // The client POST already ran PBKDF2 -> verifier, but not the raw bytes.
    // We instead use the salt + iterations and hash the verifier into bytes
    // as the "password" input for the wrapping derivation.
    const verifierBytes = b64ToBytes(verifierB64);

    const wrappingKey = await deriveKeyFromPasswordBytes(
      verifierBytes,
      saltBytes,
      iterations
    );

    // Wrap TBK using AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, tbk)
    );

    const wrappedTeamKeyB64 = bytesToB64(wrapped);
    const wrappedTeamKeyIVB64 = bytesToB64(iv);

    // No separate tag in WebCrypto AES-GCM — tag is included at end of ciphertext.
    // Store as wrappedTeamKeyB64 (ciphertext+tag).
    // ========================================================

    // ================
    // UPDATE SECURITY
    // ================
    const update = {
      $set: {
        "security.lockEnabled": true,
        "security.encVersion": "v1",
        "security.kdf.saltB64": saltB64,
        "security.kdf.iterations": iterations,
        "security.verifierB64": verifierB64,

        // 🔐 Store wrapped TBK
        "security.wrappedTeamKeyB64": wrappedTeamKeyB64,
        "security.wrappedTeamKeyIVB64": wrappedTeamKeyIVB64,
      },
    };

    const writeResult = await col.updateOne({ _id: teamDoc._id }, update);

    // Now reload fresh doc
    const fresh = await col.findOne(
      { _id: teamDoc._id },
      { projection: { _id: 1, teamSlug: 1, security: 1 } }
    );

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
    // 🔥 AUTO-ENCRYPT ALL EXISTING COACH MATCH NOTES
    // ======================================================
    const teamId = String(teamDoc._id);

    const existingNotes = await CoachMatchNote.find({
      team: teamId,
      crypto: { $exists: false },
      deletedAt: null,
    }).lean();

    let encryptedCount = 0;

    if (existingNotes.length > 0) {
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
