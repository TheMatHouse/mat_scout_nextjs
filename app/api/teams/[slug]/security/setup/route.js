// app/api/teams/[slug]/security/setup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import CoachMatchNote from "@/models/coachMatchNoteModel";

import crypto from "crypto";

/* ================================================
   Basic helpers
================================================ */

function b64e(buf) {
  return Buffer.from(buf).toString("base64");
}

function b64d(str) {
  return Buffer.from(str, "base64");
}

/** Derive 32-byte key using PBKDF2 */
function deriveWrapperKey(passwordDerivedKey, saltB64, iterations) {
  return crypto.pbkdf2Sync(
    passwordDerivedKey,
    b64d(saltB64),
    iterations,
    32,
    "sha256"
  );
}

/** AES-GCM wrap a TBK */
function wrapTBK(wrapperKey, tbkRaw) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", wrapperKey, iv);

  const ciphertext = Buffer.concat([cipher.update(tbkRaw), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: b64e(ciphertext),
    ivB64: b64e(iv),
    tagB64: b64e(tag),
  };
}

/** hash(derivedKey) */
function makeVerifier(derivedKey) {
  return b64e(crypto.createHash("sha256").update(derivedKey).digest());
}

/* ======================================================
   ROUTE: Initialize team lock + create/store TBK
====================================================== */

export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const slug = decodeURIComponent(String((await params).slug || ""));

    const body = await req.json().catch(() => ({}));
    const saltB64 = body?.kdf?.saltB64?.trim();
    const iterations = Number(body?.kdf?.iterations ?? 0);
    const verifierB64 = body?.verifierB64?.trim();

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        {
          message:
            "Missing required fields { kdf: { saltB64, iterations }, verifierB64 }",
        },
        { status: 400 }
      );
    }

    /* ===============================================
       Locate team
    =============================================== */

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id user teamSlug security")
      .lean();

    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { message: "Forbidden: Only the owner may set password" },
        { status: 403 }
      );
    }

    /* ===============================================
       Generate new TBK (32 bytes)
    =============================================== */

    const tbkRaw = crypto.randomBytes(32);

    /* ===============================================
       Derive wrapper key from password-derived key
       NOTE: Client already derived a 32-byte key
             → They sent verifierB64 for that key
       Server derives matching key using PBKDF2
    =============================================== */

    const derivedWrapperKey = deriveWrapperKey(
      Buffer.from(verifierB64, "base64"), // IMPORTANT: matches client verifier key source
      saltB64,
      iterations
    );

    /* ===============================================
       Wrap the TBK using AES-GCM
    =============================================== */

    const wrappedTBK = wrapTBK(derivedWrapperKey, tbkRaw);

    /* ===============================================
       Persist security block
    =============================================== */

    const db = mongoose.connection.db;
    const col = db.collection("teams");

    await col.updateOne(
      { _id: team._id },
      {
        $set: {
          "security.lockEnabled": true,
          "security.encVersion": "v1",
          "security.kdf": { saltB64, iterations },
          "security.verifierB64": verifierB64,
          "security.wrappedTBK": wrappedTBK,
        },
      }
    );

    /* ===============================================
       AUTO-ENCRYPT EXISTING COACH NOTES (server side)
    =============================================== */

    const existingNotes = await CoachMatchNote.find({
      team: String(team._id),
      deletedAt: null,
    }).lean();

    let encryptedCount = 0;

    for (const n of existingNotes) {
      if (n.crypto && n.crypto.ciphertextB64) continue;

      const payload = {
        whatWentWell: n.whatWentWell || "",
        reinforce: n.reinforce || "",
        needsFix: n.needsFix || "",
        notes: n.notes || "",
      };

      // Encrypt using TBK directly server-side
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", tbkRaw, iv);

      const plaintext = Buffer.from(JSON.stringify(payload));
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      await CoachMatchNote.updateOne(
        { _id: n._id },
        {
          $set: {
            crypto: {
              ciphertextB64: b64e(ciphertext),
              ivB64: b64e(iv),
              tagB64: b64e(tag),
            },
            whatWentWell: "",
            reinforce: "",
            needsFix: "",
            notes: "",
          },
        }
      );

      encryptedCount++;
    }

    /* ===============================================
       Final Response
    =============================================== */

    return NextResponse.json(
      {
        ok: true,
        message: "Team lock initialized. TBK created and stored.",
        encryptedCoachNotes: encryptedCount,
        team: {
          _id: String(team._id),
          teamSlug: slug,
          security: {
            lockEnabled: true,
            encVersion: "v1",
            kdf: { saltB64, iterations },
            verifierB64,
            // wrappedTBK intentionally NOT returned
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("security/setup ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
