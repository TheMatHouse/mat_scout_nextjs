// app/api/teams/[slug]/security/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";

/**
 * Returns the full security block for a team.
 * Includes:
 *   - lockEnabled
 *   - kdf { saltB64, iterations }
 *   - verifierB64
 *   - wrappedTBK { ciphertextB64, ivB64, tagB64 }
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));

    const team = await Team.findOne({ teamSlug: slug })
      .select("security")
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const sec = team.security || {};

    // If lock is disabled → return minimal shape
    if (!sec.lockEnabled) {
      return NextResponse.json({
        team: {
          security: {
            lockEnabled: false,
            encVersion: sec.encVersion || "v1",
          },
        },
      });
    }

    // VALIDATE KDF STRUCTURE
    const saltB64 = sec.kdf?.saltB64 || "";
    const iterations = sec.kdf?.iterations || 250000;
    const verifierB64 = sec.verifierB64 || "";

    // AES-GCM wrapped TBK (required for unlock)
    const wrappedTBK = sec.wrappedTBK || null;

    return NextResponse.json({
      team: {
        security: {
          lockEnabled: true,
          encVersion: sec.encVersion || "v1",
          kdf: {
            saltB64,
            iterations,
          },
          verifierB64,
          wrappedTBK, // 🔥 REQUIRED FOR REAL UNLOCK
        },
      },
    });
  } catch (err) {
    console.error("GET /security error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
