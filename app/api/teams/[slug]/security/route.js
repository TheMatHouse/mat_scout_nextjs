// app/api/teams/[slug]/security/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";

/**
 * GET /api/teams/[slug]/security
 *  - Always returns full security block for the team (lockEnabled, encVersion, kdf, verifierB64)
 *
 * PATCH /api/teams/[slug]/security
 * Body:
 *  - To disable lock: { lockEnabled: false }
 *  - To (re)enable/rotate: { lockEnabled: true, kdf: { saltB64, iterations }, verifierB64 }
 */

export async function GET(req, { params }) {
  try {
    await connectDB();

    const slug = decodeURIComponent(
      String((await params).slug || "")
    ).toLowerCase();

    // Require auth just to avoid exposing anything to anonymous users
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id teamSlug security")
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const sec = team.security || {};

    return NextResponse.json(
      {
        team: {
          _id: String(team._id),
          teamSlug: team.teamSlug,
          security: {
            lockEnabled: !!sec.lockEnabled,
            encVersion: sec.encVersion || "v1",
            kdf: {
              saltB64: sec.kdf?.saltB64 || "",
              iterations: sec.kdf?.iterations || 250000,
            },
            verifierB64: sec.verifierB64 || "",
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Security GET error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(
      String((await params).slug || "")
    ).toLowerCase();
    const body = await req.json().catch(() => ({}));

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id user teamSlug security")
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    // For now, only the owner can change the lock
    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Disable lock
    if (body?.lockEnabled === false) {
      const res = await Team.updateOne(
        { _id: team._id },
        {
          $set: {
            "security.lockEnabled": false,
          },
        }
      );

      const fresh = await Team.findById(team._id)
        .select("_id teamSlug security")
        .lean();

      return NextResponse.json(
        {
          message: "Team lock disabled",
          writeStats: {
            acknowledged: res.acknowledged,
            matchedCount: res.matchedCount,
            modifiedCount: res.modifiedCount,
          },
          team: {
            _id: String(fresh?._id || team._id),
            teamSlug: fresh?.teamSlug || team.teamSlug,
            security: fresh?.security || null,
          },
        },
        { status: 200 }
      );
    }

    // Enable/update (rotate) lock
    const saltB64 = body?.kdf?.saltB64?.trim();
    const iterations = Number(body?.kdf?.iterations ?? 0);
    const verifierB64 = body?.verifierB64?.trim();

    if (!saltB64 || !iterations || !verifierB64) {
      return NextResponse.json(
        {
          message:
            "Missing required fields. Expecting { kdf: { saltB64, iterations }, verifierB64 }.",
        },
        { status: 400 }
      );
    }

    const res = await Team.updateOne(
      { _id: team._id },
      {
        $set: {
          "security.lockEnabled": true,
          "security.encVersion": "v1",
          "security.kdf.saltB64": saltB64,
          "security.kdf.iterations": iterations,
          "security.verifierB64": verifierB64,
        },
      }
    );

    const fresh = await Team.findById(team._id)
      .select("_id teamSlug security")
      .lean();

    return NextResponse.json(
      {
        message: "Team password updated",
        writeStats: {
          acknowledged: res.acknowledged,
          matchedCount: res.matchedCount,
          modifiedCount: res.modifiedCount,
        },
        team: {
          _id: String(fresh?._id || team._id),
          teamSlug: fresh?.teamSlug || team.teamSlug,
          security: fresh?.security || null,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("security PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
