import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req, context) {
  try {
    await connectDB();

    const currentUser = await getCurrentUserFromCookies();
    if (!currentUser) {
      return NextResponse.json({ member: null });
    }

    const { slug } = await context.params;

    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const member = await TeamMember.findOne({
      userId: currentUser._id,
      teamId: team._id,
    });

    return NextResponse.json({ member });
  } catch (err) {
    console.error("GET /membership error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
