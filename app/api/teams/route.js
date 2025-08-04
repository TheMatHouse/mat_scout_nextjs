// app/api/teams/route.js
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import { getCurrentUserFromCookies } from "@/lib/auth-server";
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

export async function GET(req) {
  try {
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();

    // ✅ Extract query params for pagination and filters
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    const style = searchParams.get("style") || "";
    const city = searchParams.get("city") || "";
    const state = searchParams.get("state") || "";
    const country = searchParams.get("country") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    // ✅ Build filter object dynamically
    const filters = {};
    if (name) filters.teamName = { $regex: name, $options: "i" };
    if (style) filters.style = { $regex: style, $options: "i" };
    if (city) filters.city = { $regex: city, $options: "i" };
    if (state) filters.state = { $regex: state, $options: "i" };
    if (country) filters.country = { $regex: country, $options: "i" };

    // ✅ Pagination logic
    const skip = (page - 1) * limit;

    // ✅ Get total teams count (for pagination)
    const totalTeams = await Team.countDocuments(filters);

    // ✅ Fetch paginated and filtered teams
    const teams = await Team.find(filters)
      .sort({ teamName: 1 })
      .skip(skip)
      .limit(limit);

    // ✅ Fetch current user's teams
    let myTeams = [];
    if (currentUser) {
      myTeams = await Team.find({ user: currentUser._id });
    }

    return NextResponse.json(
      {
        teams,
        myTeams,
        page,
        totalPages: Math.ceil(totalTeams / limit),
        totalTeams,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return NextResponse.json(
      { message: "Failed to load teams" },
      { status: 500 }
    );
  }
}
