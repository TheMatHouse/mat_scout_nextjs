import { connectDB } from "@/lib/mongo";
import { NextResponse } from "next/server";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";

export async function GET(request, context) {
  const { username } = await context.params;

  try {
    await connectDB();

    const member = await FamilyMember.findOne({ username }).lean();
    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    const reports = await MatchReport.find({
      athleteType: "family",
      athleteId: member._id,
    })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ member, reports });
  } catch (err) {
    console.error(
      "🔥 Error in /api/family/[username]/match-reports:",
      err.message
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
