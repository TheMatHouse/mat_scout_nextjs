// app/api/teams/[slug]/security/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUser } from "@/lib/auth-server";

/**
 * GET /api/teams/[slug]/security
 *  - Returns full security block for the team:
 *    lockEnabled, encVersion, kdf, verifierB64, encryption{wrappedTeamKeyB64,...}
 *
 * PATCH /api/teams/[slug]/security
 *  - Simple gate toggle only:
 *      { lockEnabled: false }  -> turn OFF the UI lock gate
 *      { lockEnabled: true }   -> turn ON the UI lock gate
 *
 * IMPORTANT:
 *  - This endpoint NEVER changes:
 *      - security.kdf (saltB64, iterations)
 *      - security.verifierB64
 *      - security.encryption.wrappedTeamKeyB64 (Team Box Key)
 *  - Initial password setup (KDF + verifier) happens via:
 *      /api/teams/[slug]/security/setup  (POST)
 *  - Password changes (re-wrapping the TBK) happen via:
 *      /api/teams/[slug]/password        (PATCH)
 */

export async function GET(req, { params }) {
  try {
    await connectDB();

    const slug = decodeURIComponent(
      String((await params).slug || "")
    ).toLowerCase();

    // Require auth
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
    const enc = sec.encryption || {};

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
            encryption: {
              wrappedTeamKeyB64: enc.wrappedTeamKeyB64 || "",
              teamKeyVersion:
                enc.teamKeyVersion != null ? enc.teamKeyVersion : 1,
              algorithm: enc.algorithm || "aes-256-gcm",
            },
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

    // Only team owner may update lock gate
    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const hasKdfFields = body?.kdf || body?.verifierB64;

    // This route is gate-only. Reject any attempt to change KDF / verifier here.
    if (hasKdfFields) {
      return NextResponse.json(
        {
          message:
            "This endpoint only toggles lockEnabled. " +
            "Use /api/teams/[slug]/security/setup for initial password setup " +
            "or /api/teams/[slug]/password for password changes.",
        },
        { status: 400 }
      );
    }

    const lockFlag = body?.lockEnabled;

    // ============================================
    // 🔓 Disable lock (gate off, encryption unchanged)
    // ============================================
    if (lockFlag === false) {
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

    // ============================================
    // 🔒 Enable lock (gate on, password + TBK unchanged)
    //  - KDF + verifier must already exist.
    // ============================================
    if (lockFlag === true) {
      const res = await Team.updateOne(
        { _id: team._id },
        {
          $set: {
            "security.lockEnabled": true,
          },
        }
      );

      const fresh = await Team.findById(team._id)
        .select("_id teamSlug security")
        .lean();

      return NextResponse.json(
        {
          message: "Team lock enabled",
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

    // If we get here, there was nothing valid to update.
    return NextResponse.json(
      {
        message:
          "Nothing to update. Send { lockEnabled: true } or { lockEnabled: false }.",
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("security PATCH error:", err);
    return NextResponse.json(
      { message: "Server error: " + err.message },
      { status: 500 }
    );
  }
}
