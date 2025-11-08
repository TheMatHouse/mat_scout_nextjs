// app/api/admin/reports/matches/[id]/route.js
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";

export async function GET(_req, { params }) {
  try {
    await connectDB();
    const { id } = await params; // Next 15 awaited params

    const report = await MatchReport.findById(id)
      .select(
        "createdAt eventName opponentName result allowPublic notes teamSlug weightClass division video url"
      )
      .lean();

    if (!report) {
      // Return JSON 404 (so the client doesn't see HTML)
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // TODO: enforce admin auth here (return JSON 401/403 as needed)
    return NextResponse.json({ report });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load report" },
      { status: 500 }
    );
  }
}
