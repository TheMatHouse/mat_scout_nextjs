import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel";
import "@/models/matchReportModel";
import "@/models/userStyleModel";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { username } = await params;
  console.log("HIT ME");
  try {
    await connectDB();

    const user = await User.findOne({ username })
      .populate("userStyles")
      .populate("matchReports")
      .populate("scoutingReports")
      .lean();

    console.log("user ", user);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const cookiesList = await cookies();
    const currentUserId = cookiesList.get("userId")?.value;

    // Continue even if profile is private — let frontend decide how to display
    const memberships = await TeamMember.find({ userId: user._id })
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

    const familyMembers = await FamilyMember.find({ userId: user._id })
      .select("firstName lastName avatar gender username")

      .lean();

    // Attach additional data
    user.teams = teamsWithRoles;
    user.familyMembers = familyMembers;

    // Sanitize sensitive info
    delete user.password;
    delete user.tempPassword;
    delete user.lastLogin;
    delete user.scoutingReports;

    // ✅ Return user and isMyProfile flag so frontend can decide what to show
    return NextResponse.json({ user });
  } catch (err) {
    console.error("🔥 Error in /api/users/[username]:", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
