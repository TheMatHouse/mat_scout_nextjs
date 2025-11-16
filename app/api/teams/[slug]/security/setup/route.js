// app/api/teams/[slug]/security/setup/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel"; // keep for initial lookup

export async function POST(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Normalize slug
    const slug = decodeURIComponent(
      String((await params).slug || "")
    ).toLowerCase();

    // Parse body
    const body = await req.json().catch(() => ({}));
    const saltB64 = body?.kdf?.saltB64?.trim();
    const iterations = Number(body?.kdf?.iterations ?? 0);
    const verifierB64 = body?.verifierB64?.trim();

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        { message: "Missing { kdf: { saltB64, iterations }, verifierB64 }." },
        { status: 400 }
      );
    }

    // Locate the team via Mongoose (to get _id and verify it exists)
    const teamDoc = await Team.findOne({ teamSlug: slug })
      .select("_id user teamSlug")
      .lean();
    if (!teamDoc) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // Optional strict owner gate:
    // if (String(teamDoc.user) !== String(actor._id)) {
    //   return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    // }

    // === Native driver write (bypass Mongoose subdoc quirks) ===
    const db = mongoose.connection.db;
    const col = db.collection("teams");

    // Force set with dot-paths
    const update = {
      $set: {
        "security.lockEnabled": true,
        "security.encVersion": "v1",
        "security.kdf.saltB64": saltB64,
        "security.kdf.iterations": iterations,
        "security.verifierB64": verifierB64,
      },
    };

    const writeResult = await col.updateOne({ _id: teamDoc._id }, update);

    // Read back raw doc exactly as stored
    const fresh = await col.findOne(
      { _id: teamDoc._id },
      { projection: { _id: 1, teamSlug: 1, security: 1 } }
    );

    // Build some debug info to prove which DB we're hitting
    const connInfo = {
      dbName: mongoose.connection.name || null,
      host:
        (mongoose.connection.hosts && mongoose.connection.hosts[0]?.host) ||
        mongoose.connection.host ||
        null,
      port:
        (mongoose.connection.hosts && mongoose.connection.hosts[0]?.port) ||
        mongoose.connection.port ||
        null,
    };

    const payload = {
      message: "Team lock initialized",
      connection: connInfo,
      query: { _id: String(teamDoc._id), teamSlug: teamDoc.teamSlug },
      writeStats: {
        acknowledged: writeResult.acknowledged,
        matchedCount: writeResult.matchedCount,
        modifiedCount: writeResult.modifiedCount,
        upsertedId: writeResult.upsertedId ?? null,
      },
      team: {
        _id: String(fresh?._id || teamDoc._id),
        teamSlug: fresh?.teamSlug || teamDoc.teamSlug,
        security: fresh?.security ?? null,
      },
    };

    // If security still isn't there, surface as 500 with the proof attached
    const ok = !!fresh?.security && fresh.security.lockEnabled === true;
    return NextResponse.json(payload, { status: ok ? 200 : 500 });
  } catch (err) {
    console.error("security/setup POST error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
