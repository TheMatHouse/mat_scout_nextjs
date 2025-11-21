// app/api/teams/[slug]/scouting-reports/decrypt-source/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamScoutingReport from "@/models/teamScoutingReportModel";
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

    const { params } = context;
    const { slug } = await params;
    console.log("slug ", slug);
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing team slug" },
        { status: 400 }
      );
    }

    // Same slug lookup pattern you use elsewhere
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
    if (String(team.user) !== String(user._id)) {
      return NextResponse.json(
        { ok: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    // Pull ALL scouting reports for this team;
    // the client will only attempt to decrypt ones with crypto.ciphertextB64
    const reports = await TeamScoutingReport.find({
      teamId: team._id,
    })
      .select("_id teamId crypto")
      .lean();
    // Optional debug log (server-side):
    // console.log(
    //   "[decrypt-source] team",
    //   String(team._id),
    //   "reports found:",
    //   reports.length
    // );

    return NextResponse.json(
      {
        ok: true,
        scoutingReports: Array.isArray(reports) ? reports : [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("decrypt-source GET error:", err);
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to fetch scouting reports for decrypt",
      },
      { status: 500 }
    );
  }
}
