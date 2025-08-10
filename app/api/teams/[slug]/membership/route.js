// app/api/teams/[slug]/membership/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import { getCurrentUser } from "@/lib/auth-server";

export async function GET(_request, ctx) {
  try {
    await connectDB();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ memberships: [] }, { status: 200 });
    }

    const { slug } = await ctx.params;
    const team = await Team.findOne({ teamSlug: slug }).select("_id").lean();
    if (!team) {
      return NextResponse.json({ memberships: [] }, { status: 200 });
    }

    // Get family members owned by this user
    const family = await FamilyMember.find({ userId: user._id })
      .select("_id")
      .lean();
    const familyIds = family.map((f) => f._id);

    // Find memberships for the user or any of their family members on this team
    const memberships = await TeamMember.find({
      teamId: team._id,
      $or: [
        { userId: user._id },
        ...(familyIds.length ? [{ familyMemberId: { $in: familyIds } }] : []),
      ],
    }).lean();

    return NextResponse.json({ memberships }, { status: 200 });
  } catch (err) {
    console.error("GET /api/teams/[slug]/membership error:", err);
    return NextResponse.json({ memberships: [] }, { status: 500 });
  }
}
