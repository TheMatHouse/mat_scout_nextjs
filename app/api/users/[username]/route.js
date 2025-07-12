// /app/api/users/[username]/route.js
import { connectDB } from "@/lib/mongo";
import User from "@/models/userModel";
import Team from "@/models/teamModel";
import TeamMember from "@/models/teamMemberModel";
import FamilyMember from "@/models/familyMemberModel"; // ✅ Import FamilyMember model
import "@/models/matchReportModel";
import "@/models/userStyleModel";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { username } = await params;

  try {
    await connectDB();

    const user = await User.findOne({ username })
      .populate("userStyles")
      .populate("matchReports")
      .lean();

    if (!user || !user.allowPublic) {
      return NextResponse.json(
        { error: "User not found or private" },
        { status: 404 }
      );
    }

    // ✅ Find team memberships by user._id
    const memberships = await TeamMember.find({ userId: user._id })
      .select("teamId role")
      .lean();

    const teamIds = memberships.map((m) => m.teamId);

    // ✅ Fetch team info
    const teams = await Team.find({ _id: { $in: teamIds } })
      .select("teamName teamSlug logoURL")
      .lean();

    // ✅ Add role info from TeamMember to each team
    const teamsWithRoles = teams.map((team) => {
      const match = memberships.find(
        (m) => m.teamId.toString() === team._id.toString()
      );
      return {
        ...team,
        role: match?.role || "member",
      };
    });

    user.teams = teamsWithRoles;

    // ✅ Fetch family members (select minimal fields)
    const familyMembers = await FamilyMember.find({ userId: user._id })
      .select("firstName lastName avatar")
      .lean();

    user.familyMembers = familyMembers;

    // ✅ Remove sensitive info
    delete user.password;
    delete user.tempPassword;
    delete user.lastLogin;
    delete user.scoutingReports;

    return NextResponse.json({ user });
  } catch (err) {
    console.error("🔥 Error in /api/users/[username]:", err.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
