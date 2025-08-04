import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(request, { params }) {
  await connectDB();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect("/login");
  }

  const { slug } = params;
  const team = await Team.findOne({ teamSlug: slug });
  if (!team) {
    return NextResponse.redirect("/teams");
  }

  // Only withdraw pending requests
  await TeamMember.deleteOne({
    teamId: team._id,
    userId: user._id,
    role: "pending",
  });

  return NextResponse.redirect(`/teams/${slug}`);
}
