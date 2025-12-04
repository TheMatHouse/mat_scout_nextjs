export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import { getCurrentUser } from "@/lib/auth-server";
import mongoose from "mongoose";

export async function POST(req, context) {
  try {
    await connectDB();

    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

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

    if (String(team.user) !== String(actor._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const reports = Array.isArray(body?.reports) ? body.reports : [];

    if (!reports.length) {
      return NextResponse.json(
        {
          ok: true,
          updatedCount: 0,
          message: "No reports provided.",
        },
        { status: 200 }
      );
    }

    let updatedCount = 0;
    let matchedCount = 0;

    for (const rpt of reports) {
      const rawId = rpt._id || rpt.id;
      const decrypted = rpt.decrypted || {};

      if (!rawId) continue;
      const idStr = String(rawId);
      if (!mongoose.Types.ObjectId.isValid(idStr)) continue;

      // ----- Restore report fields -----
      const update = {
        $set: {
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
        },
        $unset: { crypto: "" },
      };

      const res = await TeamScoutingReport.updateOne({ _id: idStr }, update);
      matchedCount += res.matchedCount || 0;
      updatedCount += res.modifiedCount || 0;

      // ----- Restore video notes -----
      const decryptedVideos = rpt.videos || {};
      const ids = Object.keys(decryptedVideos);

      for (const vidId of ids) {
        const notes = decryptedVideos[vidId] || "";

        await Video.updateOne(
          { _id: vidId },
          {
            $set: { notes },
            $unset: { crypto: "" },
          }
        );
      }
    }

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
    console.error("bulk-decrypt error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to bulk decrypt." },
      { status: 500 }
    );
  }
}
