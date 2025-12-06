// app/api/teams/[slug]/security/verify/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";

import Team from "@/models/teamModel";
import crypto from "crypto";

/* -------------------------------------------------------
   PBKDF2 + VERIFY
------------------------------------------------------- */
function derivePasswordKey(password, saltB64, iterations) {
  const salt = Buffer.from(saltB64, "base64");
  return crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest();
}

function xorBuffers(a, b) {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

/* -------------------------------------------------------
   MAIN VERIFY ROUTE
------------------------------------------------------- */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));
    const body = await req.json().catch(() => ({}));
    const password = body?.password;

    if (!password) {
      return NextResponse.json(
        { message: "Missing password." },
        { status: 400 }
      );
    }

    // Load team
    const team = await Team.findOne({ teamSlug: slug })
      .select("security")
      .lean();

    if (!team?.security?.lockEnabled) {
      return NextResponse.json(
        { message: "Team does not have a password enabled." },
        { status: 400 }
      );
    }

    const sec = team.security;
    const { saltB64, iterations } = sec.kdf || {};
    const storedVerifier = sec.verifierB64;
    const wrappedTBK = sec.wrappedTBK;

    if (!saltB64 || !iterations || !storedVerifier || !wrappedTBK) {
      return NextResponse.json(
        { message: "Security block incomplete." },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------
       STEP 1 — Derive key from provided password
    --------------------------------------------------- */
    const derived = derivePasswordKey(password, saltB64, iterations);

    /* ---------------------------------------------------
       STEP 2 — Verify password using verifierB64
    --------------------------------------------------- */
    const computedVerifier = sha256(derived).toString("base64");

    if (computedVerifier !== storedVerifier) {
      return NextResponse.json(
        { ok: false, message: "Invalid password." },
        { status: 401 }
      );
    }

    /* ---------------------------------------------------
       STEP 3 — Unwrap TBK
    --------------------------------------------------- */
    const wrappedBytes = Buffer.from(wrappedTBK, "base64");
    const tbkBytes = xorBuffers(wrappedBytes, derived);

    /* ---------------------------------------------------
       STEP 4 — Return TBK (base64) to client
    --------------------------------------------------- */
    return NextResponse.json(
      {
        ok: true,
        tbkB64: tbkBytes.toString("base64"),
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
