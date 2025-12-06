// app/api/teams/[slug]/security/verify/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import crypto from "crypto";

/* -------------------------------------------------------
   BASE64 HELPERS
------------------------------------------------------- */
function b64d(str) {
  return Buffer.from(str, "base64");
}
function b64e(buf) {
  return Buffer.from(buf).toString("base64");
}

/* -------------------------------------------------------
   AES-GCM unwrap wrapperKey -> TBK
------------------------------------------------------- */
function unwrapTBK_AESGCM(derivedKey, wrapper) {
  const iv = b64d(wrapper.ivB64);
  const tag = b64d(wrapper.tagB64);
  const ciphertext = b64d(wrapper.ciphertextB64);

  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(tag);

  const tbkRaw = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return tbkRaw; // raw 32-byte Team Box Key
}

/* -------------------------------------------------------
   PBKDF2 derive
------------------------------------------------------- */
function derivePasswordKey(password, saltB64, iterations) {
  return crypto.pbkdf2Sync(password, b64d(saltB64), iterations, 32, "sha256");
}

/* -------------------------------------------------------
   MAIN VERIFY ROUTE
------------------------------------------------------- */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));
    const body = await req.json().catch(() => ({}));
    const password = body?.password?.trim();

    if (!password) {
      return NextResponse.json(
        { message: "Missing password" },
        { status: 400 }
      );
    }

    // Load security block
    const team = await Team.findOne({ teamSlug: slug })
      .select("security")
      .lean();

    if (!team?.security?.lockEnabled) {
      return NextResponse.json(
        { message: "Team lock not enabled" },
        { status: 400 }
      );
    }

    const sec = team.security;
    const { saltB64, iterations } = sec.kdf || {};
    const verifier = sec.verifierB64;
    const wrapped = sec.wrappedTBK;

    if (!saltB64 || !iterations || !verifier || !wrapped) {
      return NextResponse.json(
        { message: "Security block incomplete" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------
       1) Derive PBKDF2 key from provided password
    --------------------------------------------------- */
    const derivedKey = derivePasswordKey(password, saltB64, iterations);
    const computedVerifier = crypto
      .createHash("sha256")
      .update(derivedKey)
      .digest("base64");

    /* ---------------------------------------------------
       2) Check password verifier
    --------------------------------------------------- */
    if (computedVerifier !== verifier) {
      return NextResponse.json(
        { ok: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    /* ---------------------------------------------------
       3) Unwrap TBK using AES-GCM
    --------------------------------------------------- */
    let tbkRaw;
    try {
      tbkRaw = unwrapTBK_AESGCM(derivedKey, wrapped);
    } catch (err) {
      console.error("TBK unwrap failed:", err);
      return NextResponse.json(
        { ok: false, message: "Failed to unwrap TBK" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------
       4) Return TBK to client (base64)
    --------------------------------------------------- */
    return NextResponse.json(
      {
        ok: true,
        tbkB64: b64e(tbkRaw),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
