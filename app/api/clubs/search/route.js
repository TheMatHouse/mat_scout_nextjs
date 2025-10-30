// app/api/clubs/search/route.js
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";

function escapeRegex(s = "") {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const raw = (searchParams.get("q") || "").trim();
    if (raw.length < 2)
      return NextResponse.json({ clubs: [] }, { status: 200 });

    const rx = new RegExp(escapeRegex(raw), "i");

    // Simple, resilient query on Team
    const teams = await Team.find(
      {
        $or: [{ teamName: { $regex: rx } }, { teamSlug: { $regex: rx } }],
      },
      { teamName: 1 } // projection
    )
      .sort({ teamName: 1 })
      .limit(50)
      .lean();

    // Normalize + dedupe
    const clubs = Array.from(
      new Set(
        (teams || []).map((t) => (t?.teamName || "").trim()).filter(Boolean)
      )
    );

    return NextResponse.json({ clubs }, { status: 200 });
  } catch (err) {
    console.error("GET /api/clubs/search error:", err);
    // Return empty list rather than 500 to keep the UI calm
    return NextResponse.json({ clubs: [] }, { status: 200 });
  }
}
