import { NextResponse } from "next/server";
import { getCurrentUserFromCookies } from "@/lib/auth";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function POST(req, context) {
  await connectDB();
  const { slug } = await context.params;
  const user = await getCurrentUser();

  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { membershipId } = await req.json();

  if (!membershipId) {
    return NextResponse.json(
      { error: "Missing membershipId" },
      { status: 400 }
    );
  }

  const team = await Team.findOne({ teamSlug: slug });
  if (!team)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const membership = await TeamMember.findById(membershipId);
  if (!membership)
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 }
    );

  const isFamily = !!membership.familyMemberId;
  const isOwnedByUser = membership.userId?.toString() === user._id.toString();

  if (!isOwnedByUser) {
    return NextResponse.json(
      { error: "You don't have permission to remove this member." },
      { status: 403 }
    );
  }

  if (membership.role === "manager") {
    return NextResponse.json(
      { error: "Managers must transfer ownership before leaving." },
      { status: 400 }
    );
  }

  await TeamMember.findByIdAndDelete(membershipId);
  return NextResponse.json({ success: true });
}
