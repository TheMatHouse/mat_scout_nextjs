// app/api/teams/[slug]/security/verify/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";

/* ===========================================================================
   BASE64 HELPERS
=========================================================================== */
function b64d(str) {
  return Uint8Array.from(Buffer.from(str, "base64"));
}

function b64e(bytes) {
  return Buffer.from(bytes).toString("base64");
}

/* ===========================================================================
   PBKDF2
=========================================================================== */
function deriveKeySync(password, saltB64, iterations) {
  const salt = Buffer.from(saltB64, "base64");
  const key = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return new Uint8Array(key);
}

/* ===========================================================================
   AES-GCM unwrap TBK
=========================================================================== */
function unwrapTBKServer(derivedKeyBytes, wrapped) {
  const iv = Buffer.from(wrapped.ivB64, "base64");
  const ciphertext = Buffer.from(wrapped.ciphertextB64, "base64");
  const tag = Buffer.from(wrapped.tagB64, "base64");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(derivedKeyBytes),
    iv
  );
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

/* ===========================================================================
   ROUTE HANDLER
=========================================================================== */
export async function POST(req, { params }) {
  try {
    await connectDB();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent((await params).slug);
    const body = await req.json().catch(() => ({}));
    const password = body.password?.trim();

    if (!password) {
      return NextResponse.json(
        { message: "Missing password." },
        { status: 400 }
      );
    }

    const team = await Team.findOne({ teamSlug: slug }).lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found." }, { status: 404 });
    }

    const sec = team.security;
    if (
      !sec?.lockEnabled ||
      !sec?.kdf?.saltB64 ||
      !sec?.kdf?.iterations ||
      !sec?.verifierB64 ||
      !sec?.wrappedTBK
    ) {
      return NextResponse.json(
        { message: "This team is not locked or is misconfigured." },
        { status: 400 }
      );
    }

    // 1. Derive key from password
    const derivedKey = deriveKeySync(
      password,
      sec.kdf.saltB64,
      sec.kdf.iterations
    );

    // 2. Verify password
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.from(derivedKey))
      .digest();
    const verifierB64 = hash.toString("base64");

    if (verifierB64 !== sec.verifierB64) {
      return NextResponse.json(
        { message: "Incorrect password." },
        { status: 403 }
      );
    }

    // 3. Unwrap TBK
    const tbk = unwrapTBKServer(derivedKey, sec.wrappedTBK);

    // 4. Issue session unlock cookie
    const unlockToken = Buffer.from(tbk).toString("base64");

    const res = NextResponse.json({
      message: "Team unlocked.",
      unlocked: true,
    });

    res.cookies.set(`team_${team._id}_unlock`, unlockToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 60 * 12, // 12 hours
      path: `/`,
    });

    return res;
  } catch (err) {
    console.error("verify error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
