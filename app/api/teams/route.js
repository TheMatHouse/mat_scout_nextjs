// app/api/teams/route.js
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";
import TeamMember from "@/models/teamMemberModel";

export async function POST(req) {
  try {
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { teamName, teamSlug } = await req.json();

    const existing = await Team.findOne({ teamSlug });
    if (existing) {
      return NextResponse.json(
        { error: "Team slug already exists" },
        { status: 409 }
      );
    }

    const newTeam = await Team.create({
      teamName,
      teamSlug,
      user: currentUser._id,
    });

    await TeamMember.create({
      teamId: newTeam._id,
      userId: currentUser._id,
      role: "manager",
    });

    return NextResponse.json({ team: newTeam }, { status: 201 });
  } catch (err) {
    console.error("POST /teams error:", err);
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();

    // Fetch all teams
    const allTeams = await Team.find({}).sort({ teamName: 1 });

    let myTeams = [];
    if (currentUser) {
      myTeams = await Team.find({ user: currentUser._id });
    }

    return NextResponse.json({ teams: allTeams, myTeams }, { status: 200 });
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { message: "Failed to load teams" },
      { status: 500 }
    );
  }
}
