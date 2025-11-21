// app/api/teams/[slug]/security/verify/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";
import { pbkdf2Sync, createHash, timingSafeEqual } from "crypto";

// Reuse slug-tolerant lookup
async function findTeamBySlug(rawSlug) {
  const slug = decodeURIComponent(String(rawSlug || "")).toLowerCase();

  return (
    (await Team.findOne({ teamSlug: slug }).select(
      "_id teamSlug security user"
    )) ||
    (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") }).select(
      "_id teamSlug security user"
    )) ||
    (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }).select(
      "_id teamSlug security user"
    ))
  );
}

function b64ToBytes(b64) {
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

// Must mirror the client-side derivePasswordVerifier:
// 1) PBKDF2(password, salt, iterations, 32, 'sha256')
// 2) SHA-256 of that derived key
function deriveVerifier(password, saltBytes, iterations) {
  const dk = pbkdf2Sync(
    Buffer.from(password, "utf8"),
    saltBytes,
    iterations,
    32,
    "sha256"
  );
  const hash = createHash("sha256").update(dk).digest();
  return hash;
}

/**
 * POST /api/teams/[slug]/security/verify
 * Body: { password: string }
 *
 * Returns 200 with:
 *   { ok: true,  valid: true }  -> password correct
 *   { ok: true,  valid: false } -> password incorrect
 *   { ok: false, ... }          -> other errors
 */
export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { ok: false, valid: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const slug = (await params)?.slug || "";
    if (!slug) {
      return NextResponse.json(
        { ok: false, valid: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    const team = await findTeamBySlug(slug);
    if (!team) {
      return NextResponse.json(
        { ok: false, valid: false, message: "Team not found" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = String(body?.password || "").trim();

    if (!password) {
      return NextResponse.json(
        { ok: false, valid: false, message: "Password is required" },
        { status: 400 }
      );
    }

    const sec = team.security || {};
    const kdf = sec.kdf || {};
    const saltB64 = kdf.saltB64 || "";
    const iterations = Number(kdf.iterations || 0);
    const verifierB64 = sec.verifierB64 || "";

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        {
          ok: false,
          valid: false,
          message: "No team password is configured for this team.",
        },
        { status: 400 }
      );
    }

    const saltBytes = b64ToBytes(saltB64);
    const storedVerifierBytes = b64ToBytes(verifierB64);

    if (!saltBytes || !storedVerifierBytes) {
      return NextResponse.json(
        {
          ok: false,
          valid: false,
          message: "Team security configuration is invalid.",
        },
        { status: 500 }
      );
    }

    const derivedVerifier = deriveVerifier(password, saltBytes, iterations);

    let matches = false;
    try {
      matches =
        storedVerifierBytes.length === derivedVerifier.length &&
        timingSafeEqual(storedVerifierBytes, derivedVerifier);
    } catch {
      matches = false;
    }

    if (!matches) {
      // Password wrong, but request is otherwise valid
      return NextResponse.json(
        { ok: true, valid: false, message: "Invalid team password." },
        { status: 200 }
      );
    }

    // Correct password
    return NextResponse.json({ ok: true, valid: true }, { status: 200 });
  } catch (err) {
    console.error("security/verify POST error:", err);
    return NextResponse.json(
      { ok: false, valid: false, message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
