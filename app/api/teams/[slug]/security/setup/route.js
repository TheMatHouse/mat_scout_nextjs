// app/api/teams/[slug]/security/setup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

import {
  encryptScoutingBody,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

// ------------------------------------------------------------
// Base64 helpers
// ------------------------------------------------------------
function b64e(buf) {
  return Buffer.from(buf).toString("base64");
}
function b64d(b64) {
  return Buffer.from(b64, "base64");
}

// ------------------------------------------------------------
// Derive PBKDF2 key
// ------------------------------------------------------------
function deriveKdfKey(password, saltB64, iterations) {
  return crypto.pbkdf2Sync(password, b64d(saltB64), iterations, 32, "sha256");
}

// ------------------------------------------------------------
// AES-GCM wrap TBK
// ------------------------------------------------------------
function wrapTBK(derivedKey, rawTBK) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

  const ciphertext = Buffer.concat([cipher.update(rawTBK), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: b64e(ciphertext),
    ivB64: b64e(iv),
    tagB64: b64e(tag),
  };
}

// ------------------------------------------------------------
// SHA-256 verifier: hash(derivedKey)
// ------------------------------------------------------------
function makeVerifier(derivedKey) {
  return crypto.createHash("sha256").update(derivedKey).digest("base64");
}

// ------------------------------------------------------------
// MAIN ROUTE
// ------------------------------------------------------------
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));
    const { password } = await req.json();

    if (!password?.trim()) {
      return NextResponse.json(
        { message: "Password required." },
        { status: 400 }
      );
    }

    // Load team
    const team = await Team.findOne({ teamSlug: slug }).lean();
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // Owner check
    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { message: "Forbidden: only owner can set password" },
        { status: 403 }
      );
    }

    // --------------------------------------------------------
    // 1) Generate TBK
    // --------------------------------------------------------
    const tbkRaw = crypto.randomBytes(32);

    // --------------------------------------------------------
    // 2) Create KDF params + derive key
    // --------------------------------------------------------
    const salt = crypto.randomBytes(16);
    const iterations = 250000;

    const derivedKey = deriveKdfKey(password, b64e(salt), iterations);
    const verifierB64 = makeVerifier(derivedKey);

    // --------------------------------------------------------
    // 3) Wrap TBK with AES-GCM
    // --------------------------------------------------------
    const wrappedTBK = wrapTBK(derivedKey, tbkRaw);

    // --------------------------------------------------------
    // 4) Save security block into team
    // --------------------------------------------------------
    const db = mongoose.connection.db;
    const col = db.collection("teams");

    await col.updateOne(
      { _id: team._id },
      {
        $set: {
          security: {
            lockEnabled: true,
            encVersion: "v1",
            kdf: { saltB64: b64e(salt), iterations },
            verifierB64,
            wrappedTBK,
          },
        },
      }
    );

    // Reload fresh
    const fresh = await col.findOne(
      { _id: team._id },
      { projection: { _id: 1, teamSlug: 1, security: 1 } }
    );

    // --------------------------------------------------------
    // 5) Auto-encrypt all existing documents
    // --------------------------------------------------------
    let encryptedScouting = 0;
    let encryptedCoach = 0;

    // Prepare team object for encryption calls
    const encTeam = {
      _id: team._id,
      _teamKey: tbkRaw,
      security: fresh.security,
    };

    // ---- Encrypt existing scouting reports
    const reports = await TeamScoutingReport.find({
      teamId: team._id,
      crypto: { $exists: false },
    });

    for (const r of reports) {
      const { body, crypto: cryptoData } = await encryptScoutingBody(
        encTeam,
        r.toObject(),
        tbkRaw
      );

      await TeamScoutingReport.updateOne(
        { _id: r._id },
        {
          $set: {
            crypto: cryptoData,
            athleteAttackNotes: body.athleteAttackNotes,
            athleteGripNotes: body.athleteGripNotes,
            videos: body.videos,
          },
        }
      );

      encryptedScouting++;
    }

    // ---- Encrypt existing coach notes
    const notes = await CoachMatchNote.find({
      team: String(team._id),
      crypto: { $exists: false },
      deletedAt: null,
    });

    for (const n of notes) {
      const payload = {
        whatWentWell: n.whatWentWell || "",
        reinforce: n.reinforce || "",
        needsFix: n.needsFix || "",
        notes: n.notes || "",
      };

      const enc = await encryptCoachNoteBody(encTeam, payload, tbkRaw);

      await CoachMatchNote.updateOne(
        { _id: n._id },
        {
          $set: {
            crypto: enc.crypto,
            whatWentWell: "",
            reinforce: "",
            needsFix: "",
            notes: "",
          },
        }
      );

      encryptedCoach++;
    }

    // --------------------------------------------------------
    // 6) Final response
    // --------------------------------------------------------
    return NextResponse.json(
      {
        ok: true,
        message: "Team password set + existing data encrypted",
        encryptedScouting,
        encryptedCoach,
        security: fresh.security,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("SETUP ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
