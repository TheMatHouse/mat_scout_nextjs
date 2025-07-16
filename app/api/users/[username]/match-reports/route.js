import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import MatchReport from "@/models/matchReportModel";
import User from "@/models/userModel";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ username });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const reports = await MatchReport.find({
      athleteId: user._id,
      athleteType: "user",
      isPublic: true,
    }).sort({ matchDate: -1 });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error("❌ Error fetching match reports:", err);
    return NextResponse.json(
      { error: "Failed to fetch match reports." },
      { status: 500 }
    );
  }
}
