// app/api/family/[username]/route.js  (illustrative)
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import FamilyMember from "@/models/familyMemberModel";
import MatchReport from "@/models/matchReportModel";

export async function GET(_req, { params }) {
  await connectDB();
  const { username } = params;

  const member = await FamilyMember.findOne({ username })
    .populate("userStyles")
    .lean();

  if (!member) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // Add this: pull match reports for this family member
  const matchReports = await MatchReport.find(
    { athleteId: member._id, athleteType: "family" },
    { matchType: 1, result: 1 } // you can project more if needed
  ).lean();

  return NextResponse.json(
    { member: { ...member, matchReports } },
    { status: 200 }
  );
}
