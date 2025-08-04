import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongo";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import { getCurrentUser } from "@/lib/auth-server";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import { createNotification } from "@/lib/createNotification"; // ✅ Added

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

  // ✅ Determine member name (user or family member)
  let leavingName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  if (membership.familyMemberId) {
    const family = await FamilyMember.findById(membership.familyMemberId);
    if (family) {
      leavingName = `${family.firstName} ${family.lastName}`;
    }
  }

  // ✅ Delete membership
  await TeamMember.findByIdAndDelete(membershipId);

  // ✅ Fetch all managers
  const managers = await TeamMember.find({
    teamId: team._id,
    role: "manager",
  });

  // ✅ Notify all managers (except the leaving user)
  await Promise.all(
    managers
      .filter((m) => m.userId.toString() !== user._id.toString())
      .map((manager) =>
        createNotification({
          userId: manager.userId,
          type: "Team Update",
          body: `${leavingName} left ${team.teamName}`,
          link: `/teams/${slug}`,
        })
      )
  );

  return NextResponse.json({ success: true });
}
