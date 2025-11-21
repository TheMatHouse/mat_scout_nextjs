// app/api/teams/[slug]/scouting-reports/bulk-decrypt/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import { getCurrentUser } from "@/lib/auth-server";
import mongoose from "mongoose";

export async function POST(req, context) {
  console.log("HIT!!!!!!!!!!!!!!!!!!!!!!!!!!");
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { params } = context;
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    // Same team lookup pattern used elsewhere
    const team =
      (await Team.findOne({ teamSlug: slug })) ||
      (await Team.findOne({ teamSlug: slug.replace(/[-_]/g, "") })) ||
      (await Team.findOne({ teamSlug: slug.replace(/_/g, "-") }));

    if (!team) {
      return NextResponse.json(
        { ok: false, message: "Team not found" },
        { status: 404 }
      );
    }

    // Only the owner can run bulk decrypt
    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    let body = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const reports = Array.isArray(body?.reports) ? body.reports : [];
    if (!reports.length) {
      return NextResponse.json(
        {
          ok: true,
          updatedCount: 0,
          message: "No reports provided for bulk decrypt.",
        },
        { status: 200 }
      );
    }

    let updatedCount = 0;
    let matchedCount = 0;

    for (const rpt of reports) {
      const rawId = rpt?._id || rpt?.id;
      const decrypted = rpt?.decrypted || {};

      if (!rawId) continue;

      const idStr = String(rawId);
      if (!mongoose.Types.ObjectId.isValid(idStr)) {
        console.warn("Skipping invalid report ID in bulk-decrypt:", idStr);
        continue;
      }

      // Build $set with safe fallbacks
      const $set = {
        athleteFirstName: decrypted.athleteFirstName || "",
        athleteLastName: decrypted.athleteLastName || "",
        athleteNationalRank: decrypted.athleteNationalRank || "",
        athleteWorldRank: decrypted.athleteWorldRank || "",
        athleteClub: decrypted.athleteClub || "",
        athleteCountry: decrypted.athleteCountry || "",
        athleteGrip: decrypted.athleteGrip || "",
        athleteAttacks: Array.isArray(decrypted.athleteAttacks)
          ? decrypted.athleteAttacks
          : [],
        athleteAttackNotes: decrypted.athleteAttackNotes || "",
      };

      // Remove crypto field entirely
      const update = {
        $set,
        $unset: { crypto: "" },
      };

      // 🔑 IMPORTANT: only filter by _id here.
      // decrypt-source already guaranteed these reports belong to this team.
      const result = await TeamScoutingReport.updateOne({ _id: idStr }, update);

      matchedCount += result.matchedCount || 0;
      updatedCount += result.modifiedCount || 0;
    }

    console.log(
      "[bulk-decrypt] input=%d matched=%d updated=%d",
      reports.length,
      matchedCount,
      updatedCount
    );

    return NextResponse.json(
      {
        ok: true,
        updatedCount,
        matchedCount,
        inputCount: reports.length,
        message: `Decrypted ${updatedCount} scouting report(s).`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("bulk-decrypt POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to bulk-decrypt scouting reports",
      },
      { status: 500 }
    );
  }
}
