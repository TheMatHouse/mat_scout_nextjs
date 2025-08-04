import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(request, { params }) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ memberships: [] });
    }

    const { slug } = await params;
    const team = await Team.findOne({ teamSlug: slug });
    if (!team) {
      return NextResponse.json({ memberships: [] });
    }

    // Get family members for user
    const family = await FamilyMember.find({ user: user._id }).select("_id");
    const familyIds = family.map((f) => f._id);

    // Find all team memberships for user and family
    const memberships = await TeamMember.find({
      teamId: team._id,
      $or: [{ userId: user._id }, { familyMemberId: { $in: familyIds } }],
    });

    return NextResponse.json({ memberships });
  } catch (err) {
    console.error("GET /api/teams/[slug]/membership error:", err);
    return NextResponse.json({ memberships: [] }, { status: 500 });
  }
}
