// app/api/teams/[slug]/scouting-reports/bulk-encrypt/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import { getCurrentUser } from "@/lib/auth-server";

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

    // Only owner can bulk-encrypt
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // 🔐 Extra safety: do not allow bulk-encrypt if no password is configured
    const sec = team.security || {};
    const hasPassword =
      !!sec.kdf?.saltB64 && !!sec.kdf?.iterations && !!sec.verifierB64;

    if (!hasPassword) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "This team does not have a password configured. Set a team password before bulk-encrypting scouting reports.",
        },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const reports = Array.isArray(body?.reports) ? body.reports : [];

    if (!reports.length) {
      return NextResponse.json(
        { ok: false, message: "No reports supplied for bulk encrypt" },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    for (const r of reports) {
      const idRaw = r._id || r.id;
      const crypto = r.crypto || null;

      if (!idRaw || !crypto) {
        continue;
      }

      const id = String(idRaw);

      try {
        const result = await TeamScoutingReport.updateOne(
          {
            _id: id,
            teamId: team._id,
          },
          {
            $set: {
              crypto,
              // blank out sensitive fields; they now only exist inside `crypto`
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

        if (result.modifiedCount > 0 || result.matchedCount > 0) {
          updatedCount += 1;
        }
      } catch (err) {
        console.warn(
          "[BULK-ENCRYPT] Skipping report due to update error for _id:",
          idRaw,
          err
        );
      }
    }

    console.log(
      "[BULK-ENCRYPT] Updated reports:",
      updatedCount,
      "of",
      reports.length
    );

    if (!updatedCount) {
      return NextResponse.json(
        {
          ok: false,
          message: "No reports could be updated during bulk encrypt.",
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
    console.error("bulk-encrypt POST error:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Bulk encrypt failed.",
      },
      { status: 500 }
    );
  }
}
