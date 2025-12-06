export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import { getCurrentUser } from "@/lib/auth-server";
import Team from "@/models/teamModel";

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

    // UNLOCK DISABLED → RETURN CORRECT SHAPE
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

    // LOCK ENABLED → RETURN FULL SECURITY BLOCK
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
