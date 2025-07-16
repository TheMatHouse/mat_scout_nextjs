import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import FamilyMember from "@/models/familyMemberModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import "@/models/matchReportModel";
import "@/models/userStyleModel";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, context) {
  const { username } = await context.params;

  try {
    await connectDB();

    const member = await FamilyMember.findOne({ username })
      .populate("userStyles")
      .populate("matchReports")
      .lean();

    if (!member) {
      return NextResponse.json(
        { error: "Family member not found" },
        { status: 404 }
      );
    }

    const cookiesList = await cookies();
    const currentUserId = cookiesList.get("userId")?.value;

    const isParent =
      currentUserId && member.parentId?.toString() === currentUserId;

    if (!member.allowPublic && !isParent) {
      return NextResponse.json(
        { error: "Family member not found or private" },
        { status: 404 }
      );
    }

    const memberships = await TeamMember.find({ userId: member._id })
      .select("teamId role")
      .lean();

    const teamIds = memberships.map((m) => m.teamId);
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("teamName teamSlug logoURL")
      .lean();

    const teamsWithRoles = teams.map((team) => {
      const match = memberships.find(
        (m) => m.teamId.toString() === team._id.toString()
      );
      return {
        ...team,
        role: match?.role || "member",
      };
    });

    member.teams = teamsWithRoles;

    // Sanitize sensitive info
    delete member.password;
    delete member.tempPassword;
    delete member.lastLogin;
    delete member.scoutingReports;

    return NextResponse.json({ member });
  } catch (err) {
    console.error("🔥 Error in /api/family/[username]:", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
