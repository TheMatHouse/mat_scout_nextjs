// app/api/teams/[slug]/security/change-password/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";

/* ============================================================
   Helpers for TBK unwrapping & rewrapping using PBKDF2 & AES-GCM
=============================================================== */

import crypto from "crypto";

function b64e(b) {
  return Buffer.from(b).toString("base64");
}
function b64d(s) {
  return Buffer.from(s, "base64");
}

/** Derive a 32-byte key from password + KDF params */
function deriveKdfKey(password, saltB64, iterations) {
  return crypto.pbkdf2Sync(password, b64d(saltB64), iterations, 32, "sha256");
}

/** AES-GCM decrypt wrapperKeyCiphertext returning raw TBK */
function unwrapTBK(derivedKey, wrapperCrypto) {
  const iv = b64d(wrapperCrypto.ivB64);
  const tag = b64d(wrapperCrypto.tagB64);
  const ciphertext = b64d(wrapperCrypto.ciphertextB64);

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(tag);

  const tbk = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return tbk; // raw TBK (32 bytes)
}

/** AES-GCM encrypt TBK producing new wrapper crypto */
function wrapTBK(derivedKey, tbkRaw) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", derivedKey, iv);

  const ciphertext = Buffer.concat([cipher.update(tbkRaw), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertextB64: b64e(ciphertext),
    ivB64: b64e(iv),
    tagB64: b64e(tag),
  };
}

/** hash(derivedKey) — used as password verifier */
function deriveVerifier(derivedKey) {
  const hash = crypto.createHash("sha256").update(derivedKey).digest();
  return b64e(hash);
}

/* ============================================================
   ROUTE: Change Password (Rotate TBK Wrapper)
=============================================================== */

export async function POST(req, { params }) {
  try {
    await connectDB();
    const actor = await getCurrentUser();
    if (!actor)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const slug = decodeURIComponent(String((await params).slug || ""));

    const body = await req.json().catch(() => ({}));
    const oldPassword = body.oldPassword?.trim();
    const newPassword = body.newPassword?.trim();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { message: "Missing oldPassword or newPassword" },
        { status: 400 }
      );
    }

    // Load team with security block
    const team = await Team.findOne({ teamSlug: slug })
      .select("_id user security")
      .lean();

    if (!team)
      return NextResponse.json({ message: "Team not found" }, { status: 404 });

    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { message: "Forbidden: Only owner may change password" },
        { status: 403 }
      );
    }

    const sec = team.security;
    if (
      !sec ||
      !sec.lockEnabled ||
      !sec.kdf?.saltB64 ||
      !sec.kdf?.iterations ||
      !sec.verifierB64 ||
      !sec.wrappedTBK
    ) {
      return NextResponse.json(
        { message: "Team lock is not initialized properly" },
        { status: 400 }
      );
    }

    /* ===============================================
       1) Verify old password by deriving old verifier
    =============================================== */

    const derivedOldKey = deriveKdfKey(
      oldPassword,
      sec.kdf.saltB64,
      sec.kdf.iterations
    );

    const computedVerifier = deriveVerifier(derivedOldKey);

    if (computedVerifier !== sec.verifierB64) {
      return NextResponse.json(
        { message: "Incorrect old password" },
        { status: 403 }
      );
    }

    /* ===============================================
       2) Unwrap TBK using old derived key
    =============================================== */

    const tbkRaw = unwrapTBK(derivedOldKey, sec.wrappedTBK); // <== RAW TBK BUFFER

    /* ===============================================
       3) Create NEW KDF params for new password
    =============================================== */

    const newSalt = crypto.randomBytes(16);
    const newIterations = 250000; // Best practice
    const derivedNewKey = crypto.pbkdf2Sync(
      newPassword,
      newSalt,
      newIterations,
      32,
      "sha256"
    );

    const newVerifier = deriveVerifier(derivedNewKey);

    /* ===============================================
       4) Rewrap the SAME TBK using derivedNewKey
    =============================================== */

    const newWrappedTBK = wrapTBK(derivedNewKey, tbkRaw);

    /* ===============================================
       5) Persist new verifier, KDF params, wrappedTBK
    =============================================== */

    const db = mongoose.connection.db;
    const col = db.collection("teams");

    await col.updateOne(
      { _id: team._id },
      {
        $set: {
          "security.lockEnabled": true,
          "security.kdf": {
            saltB64: b64e(newSalt),
            iterations: newIterations,
          },
          "security.verifierB64": newVerifier,
          "security.wrappedTBK": newWrappedTBK,
        },
      }
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Team password updated successfully.",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("CHANGE-PASSWORD ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
