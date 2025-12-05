export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import { getCurrentUser } from "@/lib/auth-server";

// ✅ Correct helper names from teamLock.js
import {
  encryptScoutingBody,
  encryptCoachNoteBody,
} from "@/lib/crypto/teamLock";

export async function POST(req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
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

    // Owner check
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const sec = team.security || {};
    const hasPassword =
      !!sec?.kdf?.saltB64 &&
      !!sec?.kdf?.iterations &&
      !!sec?.verifierB64 &&
      sec.lockEnabled;

    if (!hasPassword) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Team has no password configured. Set a password before bulk-encrypting.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const reports = Array.isArray(body?.reports) ? body.reports : [];

    if (!reports.length) {
      return NextResponse.json(
        { ok: false, message: "No reports provided." },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const r of reports) {
      const id = String(r._id || r.id);
      if (!id) continue;

      const decrypted = r.decrypted || {};
      const report = await TeamScoutingReport.findById(id).lean();
      if (!report) continue;

      // Skip if already encrypted
      if (report.crypto?.ciphertextB64) continue;

      // ✅ Encrypt scouting report using correct helper name
      const enc = await encryptScoutingBody(team, decrypted);

      await TeamScoutingReport.updateOne(
        { _id: id },
        {
          $set: {
            crypto: enc.crypto,

            // wipe plaintext columns
            athleteFirstName: "",
            athleteLastName: "",
            athleteNationalRank: "",
            athleteWorldRank: "",
            athleteClub: "",
            athleteCountry: "",
            athleteGrip: "",
            athleteAttacks: [],
            athleteAttackNotes: "",
          },
        }
      );

      // ----- Encrypt video notes -----
      const videos = await Video.find({ report: id }).lean();
      for (const v of videos) {
        if (!v.notes) continue;

        // Reuse coach-note encryption
        const encVid = await encryptCoachNoteBody(team, v.notes);

        await Video.updateOne(
          { _id: v._id },
          {
            $set: {
              crypto: encVid.crypto,
              notes: "",
            },
          }
        );
      }

      updatedCount++;
    }

    if (!updatedCount) {
      return NextResponse.json(
        {
          ok: false,
          message: "No reports were encrypted.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        count: updatedCount,
        message: `Encrypted ${updatedCount} scouting report(s).`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("bulk-encrypt error:", err);
    return NextResponse.json(
      { ok: false, message: "Bulk encrypt failed." },
      { status: 500 }
    );
  }
}
