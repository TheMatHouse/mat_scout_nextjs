import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";

import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";

export const dynamic = "force-dynamic";

// case-insensitive exact match
const exactI = (v) =>
  new RegExp(`^${v.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}$`, "i");

export async function GET(req, ctx) {
  try {
    await connectDB();

    // ✅ Next 14: await params
    const { username: rawUsername } = await ctx.params;
    const username = String(rawUsername || "").trim();
    if (!username) {
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    }

    // Find the family member by username only (your schema)
    const member = await FamilyMember.findOne({ username: exactI(username) })
      .select("_id username")
      .lean();

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    // Public flag can be boolean/string/number depending on how it was saved
    const isPublicTrue = { $in: [true, "true", 1, "1"] };

    // 🔑 Match reports where athleteId === family member _id
    // (Include `athlete` as a fallback just in case some older docs used that field.)
    const reports = await MatchReport.find({
      isPublic: isPublicTrue,
      $or: [{ athleteId: member._id }, { athlete: member._id }],
    })
      .select(
        "_id matchType eventName opponentName opponentCountry result matchDate isPublic videoURL videoTitle"
      )
      .sort({ matchDate: -1 })
      .lean();

    // Optional: debug mode ?debug=1
    const url = new URL(req.url);
    if (url.searchParams.get("debug") === "1") {
      return NextResponse.json(
        {
          ok: true,
          count: reports.length,
          reports,
          debug: { memberId: String(member._id), username: member.username },
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, reports }, { status: 200 });
  } catch (err) {
    console.error("GET /api/family/[username]/match-reports failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
