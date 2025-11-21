// app/api/teams/[slug]/password/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";

/**
 * PATCH /api/teams/[slug]/password
 *
 * This endpoint is responsible for:
 *  - Persisting the team password KDF metadata (saltB64, iterations, verifierB64)
 *  - Persisting the wrapped Team Box Key (wrappedTeamKeyB64) + teamKeyVersion
 *
 * All TBK creation / wrapping is done on the client:
 *  - Client derives key with KDF
 *  - Client wraps TBK with that key
 *  - Client sends the wrapped TBK + KDF params here
 *
 * IMPORTANT:
 *  - This endpoint does NOT re-encrypt any scouting reports.
 *  - Changing the password only re-wraps the existing TBK.
 *  - Reports remain encrypted with the same TBK at rest.
 */

export async function PATCH(req, context) {
  try {
    await connectDB();

    const { params } = context;
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { message: "Missing team slug" },
        { status: 400 }
      );
    }

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser || !currentUser._id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      saltB64,
      iterations,
      verifierB64,
      wrappedTeamKeyB64,
      teamKeyVersion,
    } = await req.json();

    if (!saltB64 || !verifierB64 || !wrappedTeamKeyB64) {
      return NextResponse.json(
        { message: "Missing required encryption parameters" },
        { status: 400 }
      );
    }

    const safeIterations = Number(iterations) > 0 ? Number(iterations) : 250000;

    // Handle slug normalization (_ vs -) the same way as other team routes
    const decodedSlug = decodeURIComponent(String(slug || "")).toLowerCase();

    const team =
      (await Team.findOne({ teamSlug: decodedSlug })) ||
      (await Team.findOne({ teamSlug: decodedSlug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: decodedSlug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // TODO (optional): restrict to team owner/manager
    if (!team.security) team.security = {};
    if (!team.security.kdf) team.security.kdf = {};
    if (!team.security.encryption) team.security.encryption = {};

    // KDF + verifier (password metadata)
    team.security.kdf.saltB64 = saltB64;
    team.security.kdf.iterations = safeIterations;
    team.security.verifierB64 = verifierB64;

    // Turning on lock here is fine; UI can still toggle lockEnabled separately
    team.security.lockEnabled = true;
    team.security.encVersion = team.security.encVersion || "v1";

    // TBK wrapping metadata
    team.security.encryption.wrappedTeamKeyB64 = wrappedTeamKeyB64;
    if (typeof teamKeyVersion === "number") {
      team.security.encryption.teamKeyVersion = teamKeyVersion;
    }
    // Optional: record algorithm used for TBK-wrapped reports (helps future migrations)
    if (!team.security.encryption.algorithm) {
      team.security.encryption.algorithm = "TBK-AES-GCM-256";
    }

    await team.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PATCH /teams/[slug]/password error:", err);
    return NextResponse.json(
      { message: "Failed to update team password", error: err.message },
      { status: 500 }
    );
  }
}
