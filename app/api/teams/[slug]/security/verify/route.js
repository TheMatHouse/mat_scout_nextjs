export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";
import crypto from "crypto";

/* ---------------------- Helpers ---------------------- */
const b64d = (s) => Buffer.from(s, "base64");
const b64e = (b) => Buffer.from(b).toString("base64");

/**
 * AES-GCM unwrap TBK
 * wrappedTBK = { ciphertextB64, ivB64, tagB64 }
 */
function unwrapTBK_AESGCM(derivedKey, wrapped) {
  const iv = b64d(wrapped.ivB64);
  const tag = b64d(wrapped.tagB64);
  const ciphertext = b64d(wrapped.ciphertextB64);

  // AES-GCM in Node expects ciphertext, then setAuthTag(tag)
  const decipher = crypto.createDecipheriv("aes-256-gcm", derivedKey, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/* ---------------------- Route ------------------------ */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
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

    if (
      !sec.kdf?.saltB64 ||
      !sec.kdf?.iterations ||
      !sec.verifierB64 ||
      !sec.wrappedTBK
    ) {
      return NextResponse.json(
        { message: "Security block incomplete" },
        { status: 500 }
      );
    }

    /* ------------------ Derive PBKDF2 key ------------------ */
    const derivedKey = crypto.pbkdf2Sync(
      password,
      b64d(sec.kdf.saltB64),
      sec.kdf.iterations,
      32,
      "sha256"
    );

    /* ------------------ Verify password ------------------ */
    const computedVerifier = crypto
      .createHash("sha256")
      .update(derivedKey)
      .digest("base64");

    if (computedVerifier !== sec.verifierB64) {
      return NextResponse.json(
        { ok: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    /* ------------------ Unwrap TBK ------------------ */
    let tbkRaw;
    try {
      tbkRaw = unwrapTBK_AESGCM(derivedKey, sec.wrappedTBK);
    } catch (err) {
      console.error("TBK unwrap failed:", err);
      return NextResponse.json(
        { ok: false, message: "Failed to unwrap TBK" },
        { status: 500 }
      );
    }

    /* ------------------ Return TBK ------------------ */
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
