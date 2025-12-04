export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
import Video from "@/models/videoModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(_req, context) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { slug } = await context.params;

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

    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const reports = await TeamScoutingReport.find({ teamId: team._id })
      .select("_id teamId crypto videos")
      .lean();

    const result = [];

    for (const rpt of reports) {
      const videos = await Video.find({ report: rpt._id })
        .select("_id crypto")
        .lean();

      result.push({
        _id: rpt._id,
        crypto: rpt.crypto || null,
        videos,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        scoutingReports: result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("decrypt-source error:", err);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch decrypt-source data." },
      { status: 500 }
    );
  }
}
