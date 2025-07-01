import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";

export async function GET(request, context) {
  await connectDB();

  const { slug } = await context.params;

  try {
    const team = await Team.findOne({ teamSlug: slug });

    if (!team) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
