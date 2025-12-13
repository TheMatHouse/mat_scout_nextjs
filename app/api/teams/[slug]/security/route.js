export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";

/* ============================================================================
   GET — return security metadata only
============================================================================ */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));

    const team = await Team.findOne({ teamSlug: slug })
      .select("_id security")
      .lean();

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    const sec = team.security || {};

    if (!sec.lockEnabled) {
      return NextResponse.json({
        team: {
          _id: team._id,
          security: {
            lockEnabled: false,
            encVersion: sec.encVersion || "v1",
          },
        },
      });
    }

    return NextResponse.json({
      team: {
        _id: team._id,
        security: {
          lockEnabled: true,
          encVersion: sec.encVersion || "v1",
          kdf: {
            saltB64: sec.kdf?.saltB64 || "",
            iterations: sec.kdf?.iterations || 250000,
          },
          verifierB64: sec.verifierB64 || "",
          wrappedTBK: sec.wrappedTBK || null,
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

/* ============================================================================
   PATCH — OPTION A (TBK REWRAP)
============================================================================ */
export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const slug = decodeURIComponent(String((await params).slug || ""));
    const body = await req.json();

    const { lockEnabled, kdf, verifierB64, wrappedTBK } = body || {};

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    /* ------------------------------------------------------------------------
       DISABLE LOCK (NO DATA LOSS)
    ------------------------------------------------------------------------ */
    if (lockEnabled === false) {
      team.security = {
        ...team.security,
        lockEnabled: false,
      };

      await team.save();
      return NextResponse.json({ ok: true });
    }

    /* ------------------------------------------------------------------------
       ENABLE / UPDATE PASSWORD (Option A)
       Browser already unlocked & rewrapped TBK
    ------------------------------------------------------------------------ */
    if (!kdf?.saltB64 || !kdf?.iterations || !verifierB64 || !wrappedTBK) {
      return NextResponse.json(
        {
          message: "Missing required fields (kdf, verifierB64, wrappedTBK)",
        },
        { status: 400 }
      );
    }

    team.security = {
      lockEnabled: true,
      encVersion: "v1",
      kdf: {
        saltB64: kdf.saltB64,
        iterations: kdf.iterations,
      },
      verifierB64,
      wrappedTBK,
    };

    await team.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /security error:", err);
    return NextResponse.json(
      { message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
