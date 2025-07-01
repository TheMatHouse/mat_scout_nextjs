// app/api/check-team-slug/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let teamSlug = searchParams.get("teamSlug");

  if (!teamSlug) {
    return NextResponse.json(
      { available: false, message: "Team slug is required" },
      { status: 400 }
    );
  }

  teamSlug = teamSlug.trim().toLowerCase();

  try {
    await connectDB();

    const existingTeam = await Team.findOne({ teamSlug });

    return NextResponse.json({ available: !existingTeam });
  } catch (err) {
    console.error("Error checking team slug:", err);
    return NextResponse.json(
      { available: false, message: "Server error" },
      { status: 500 }
    );
  }
}
